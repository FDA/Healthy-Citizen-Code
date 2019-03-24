const _ = require('lodash');
const Promise = require('bluebird');
const log = require('log4js').getLogger('lib/database-abstraction');
const { AccessError } = require('./errors');

/**
 * @module database-abstraction
 * This module was create in an attempt to abstract database access from the rest of the code.
 * The primary reason is that mongoose is doing terrible job with middleware, so we need to call
 * pre and post hooks manually.
 * Overall it would be great to get rid of mongoose completely and work directly with the driver.
 * This will be possible with further expansion of this module.
 */
module.exports = appLib => {
  const { transformers } = appLib;
  const { hashObject, MONGO } = appLib.butil;

  const m = {};

  m.getConditionForActualRecord = () =>
    MONGO.and({ deletedAt: { $eq: null } }, { _temporary: { $eq: null } });

  /**
   * Updates ONE document based on mongoConditions
   * This method is tricky because it needs to call transformers and validations on the portion of the document
   * That only sits in the req.body.data
   * @param model
   * @param userContext
   * @param mongoConditions
   * @param data
   * @param path the path to the element of appModel that's being updated ("" if the entire record is being updated)
   */
  m.updateItem = ({ model, userContext, mongoConditions, data, path }) => {
    const newConditions = MONGO.and(mongoConditions, m.getConditionForActualRecord());
    return transformers
      .preSaveTransformData(model.modelName, userContext, data, path)
      .then(() => model.replaceOne(newConditions, data))
      .then(stats => {
        if (stats.ok !== 1 || stats.nModified < 1) {
          throw new Error(`Unable to update item`);
        }
        return appLib.cache.clearCacheForModel(model.modelName);
      })
      .catch(err => {
        log.error(
          `Unable to replace '${model.modelName}' item by conditions: `,
          newConditions,
          '\nError:',
          err.message
        );
        throw new Error('You are not allowed to update the item');
      });
  };

  m.upsertItem = ({ model, userContext, mongoConditions, data, path }) =>
    model.findOne(mongoConditions).then(doc => {
      if (doc) {
        return m.updateItem({
          model,
          userContext,
          mongoConditions,
          data,
          path,
        });
      }
      return m.createItemCheckingConditions(model, mongoConditions, userContext, data);
    });

  /**
   * Creates/saves new item.
   * This creates whole new item, not just a submodel of existin element, so the transformers and validators should be applied to the whole item
   */
  m.createItem = (Model, userContext, origData) => {
    const data = _.cloneDeep(origData);
    return transformers.preSaveTransformData(Model.modelName, userContext, data, []).then(() => {
      // Used for preserving key order in objects.
      // Recommendation from one of authors: https://github.com/Automattic/mongoose/issues/2749#issuecomment-234737744
      Model.schema.options.retainKeyOrder = true;
      const record = new Model(data);
      return record.save();
    });
  };

  /**
   * @param Model - mongoose Model
   * @param savedItemId - id of saved tepmorary record
   * @param updatedTempRecord - updated record with unset _temporary flag
   * @returns {*}
   */
  function handleUpdatedTemporaryRecord(Model, savedItemId, updatedTempRecord) {
    if (!updatedTempRecord) {
      // remove temporary record immediately
      return Model.remove({ _id: savedItemId, _temporary: true }).then(() => {
        throw new AccessError(`Not enough permissions to create the item.`);
      });
    }
    return Promise.resolve(updatedTempRecord);
  }

  /**
   * Creates item with following steps:
   * 1) Create desired item with temporary flag.
   * 2) Check whether created temporary item is allowed to be created for current user.
   * 3) Remove temporary flag from created record if its allowed.
   * 4) Otherwise remove whole temporary record.
   * This is done in this way because permission scopes contain mongo conditions.
   * Otherwise we would have to implement own condition parser.
   * @param Model
   * @param mongoConditions
   * @param userContext
   * @param origData
   */
  m.createItemCheckingConditions = (Model, mongoConditions, userContext, origData) => {
    const data = _.cloneDeep(origData);
    let savedItem;
    let updatedItem;

    return transformers
      .preSaveTransformData(Model.modelName, userContext, data, [])
      .then(() => {
        // Used for preserving key order in objects.
        // Recommendation from one of authors: https://github.com/Automattic/mongoose/issues/2749#issuecomment-234737744
        Model.schema.options.retainKeyOrder = true;
        data._temporary = true;
        const record = new Model(data);
        return record.save();
      })
      .then(item => {
        savedItem = item;
        return Model.findOneAndUpdate(
          { ...mongoConditions, _temporary: true, _id: item._id },
          { $unset: { _temporary: 1 } },
          { new: true }
        );
      })
      .then(updatedDoc => {
        updatedItem = updatedDoc;
        return handleUpdatedTemporaryRecord(Model, savedItem._id, updatedItem);
      })
      .then(() => appLib.cache.clearCacheForModel(Model.modelName))
      .then(() => updatedItem);
  };

  m.removeItem = (model, conditions) => {
    const newConditions = MONGO.and(conditions, m.getConditionForActualRecord());
    return model
      .findOneAndUpdate(newConditions, { $set: { deletedAt: new Date() } })
      .then(() => appLib.cache.clearCacheForModel(model.modelName));
  };

  m.findItems = ({
    model,
    userContext,
    conditions = {},
    projections = {},
    sort = {},
    skip = 0,
    limit = -1,
  }) =>
    m
      .rawFindItems({ model, userContext, conditions, projections, sort, skip, limit })
      .then(data => m.postTransform(data, model.modelName, userContext));

  m.rawFindItems = ({
    model,
    conditions = {},
    projections = {},
    sort = {},
    skip = 0,
    limit = -1,
  }) => {
    const newConditions = MONGO.and(conditions, m.getConditionForActualRecord());
    return model
      .find(newConditions, projections)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
  };

  m.rawAggregateItems = ({
    model,
    conditions = {},
    projections = {},
    sort = {},
    skip = 0,
    limit = -1,
  }) => {
    const newConditions = MONGO.and(conditions, m.getConditionForActualRecord());

    const aggregate = model.aggregate().match(newConditions);
    if (!_.isEmpty(projections)) {
      aggregate.project(projections);
    }
    if (!_.isEmpty(sort)) {
      aggregate.sort(sort);
    }
    aggregate.skip(skip);
    if (limit > 0) {
      aggregate.limit(limit);
    }

    return aggregate.exec();
  };

  m.aggregateItems = ({
    model,
    userContext,
    conditions = {},
    projections = {},
    sort = {},
    skip = 0,
    limit = -1,
  }) =>
    m
      .rawAggregateItems({
        model,
        conditions,
        projections,
        sort,
        skip,
        limit,
      })
      .then(data => m.postTransform(data, model.modelName, userContext));

  m.getItemsUsingCache = ({
    model,
    userContext,
    conditions = {},
    projections = {},
    sort = {},
    skip = 0,
    limit = -1,
  }) => {
    let paramHash;
    let key;
    const params = {
      conditions,
      projections,
      sort,
      skip,
      limit,
    };
    try {
      paramHash = hashObject(params);
      key = `${model.modelName}:${paramHash}`;
    } catch (e) {
      log.warn(`Unable to hash params`, params, e.stack);
    }

    const getPromise = () =>
      m.aggregateItems({
        model,
        userContext,
        conditions,
        projections,
        sort,
        skip,
        limit,
      });
    return appLib.cache.getUsingCache(getPromise, key);
  };

  m.postTransform = (data, modelName, userContext) => {
    if (_.isEmpty(data)) {
      return Promise.resolve(data);
    }
    return Promise.mapSeries(data, el =>
      transformers.postInitTransformData(modelName, userContext, el)
    ).then(() => data);
  };

  return m;
};
