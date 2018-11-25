const _ = require('lodash');

/**
 * @module database-abstraction
 * This module was create in an attempt to abstract database access from the rest of the code.
 * The primary reason is that mongoose is doing terrible job with middleware, so we need to call
 * pre and post hooks manually.
 * Overall it would be great to get rid of mongoose completely and work directly with the driver.
 * This will be possible with further expansion of this module.
 */
module.exports = appLib => {
  const transformers = require('./transformers')(appLib);
  const m = {};

  m.getConditionForActualRecord = () => ({
    $and: [{ deletedAt: { $eq: null } }, { _temporary: { $eq: null } }],
  });

  /**
   * Updates ONE document based on mongoConditions
   * This method is tricky because it needs to call transformers and validations on the portion of the document
   * That only sits in the req.body.data
   * NOTE that the whole record needs to be updated because mongodb does not support updating nested arrays and objects as of 4.2
   * Some optimization includes using '$' placeholder for arrays, but it only allows diving 1 level down as there cannot
   * be more than one '$' per condition. Watch after mongodb enhancements in the future versions.
   * IDEA: if we limit the depth of the database structure to 3 levels we can optimize these queries
   * TODO: optimize queries using $, projection and other features available in mongo at the moment
   * @param action  operation to perform: $set, $push or $pull. Do not use these directly in mongodb query, read note above
   * @param model
   * @param userContext
   * @param mongoProjections
   * @param mongoConditions
   * @param data
   * @param path the path to the element of appModel that's being updated ("" if the entire record is being updated)
   */
  m.updateItem = ({ model, userContext, mongoConditions, data, path }) =>
    // log.trace(`${action} ${path} ${JSON.stringify(data, null, 4)}`);
    transformers
      .preSaveTransformData(model.modelName, userContext, data, path)
      .then(() => {
        const newConditions = { $and: [mongoConditions, m.getConditionForActualRecord()] };
        return model.findOneAndUpdate(newConditions, data, { new: true, strict: true });
      })
      .then(doc => {
        if (!doc) {
          throw new Error('You are not allowed to update the item');
        }
      });

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
        throw {
          code: 'NO_PERMISSIONS_TO_CREATE',
          message: `Not enough permissions to create the item.`,
        };
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
      .then(newDoc => handleUpdatedTemporaryRecord(Model, savedItem._id, newDoc));
  };

  m.removeItem = (model, conditions) => {
    const newConditions = { $and: [conditions, m.getConditionForActualRecord()] };
    return model.findOneAndUpdate(newConditions, { $set: { deletedAt: new Date() } });
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
      .then(data => m.postProcess(data, model.modelName, userContext, true));

  // TODO: rewrite using cursors?
  m.rawFindItems = ({
    model,
    conditions = {},
    projections = {},
    sort = {},
    skip = 0,
    limit = -1,
  }) => {
    const newConditions = { $and: [conditions, m.getConditionForActualRecord()] };
    return model
      .find(newConditions, projections)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
  };

  m.aggregateItems = (
    model,
    conditions = {},
    projections = {},
    sort = {},
    skip = 0,
    limit = -1
  ) => {
    const newConditions = { $and: [conditions, m.getConditionForActualRecord()] };

    let aggregate = model.aggregate().match(newConditions);
    if (!_.isEmpty(projections)) {
      aggregate = aggregate.project(projections);
    }
    if (!_.isEmpty(sort)) {
      aggregate = aggregate.sort(sort);
    }
    aggregate = aggregate.skip(skip);
    if (limit > 0) {
      aggregate = aggregate.limit(limit);
    }

    return aggregate.exec();
  };

  m.postProcess = (data, modelName, userContext, runPostprocessing) => {
    if (!_.isEmpty(data)) {
      if (runPostprocessing) {
        // some operations like putItems require postprocessing to be skipped
        return Promise.mapSeries(data, el =>
          transformers.postInitTransformData(modelName, userContext, el)
        ).then(() => data);
      }
    }
    return Promise.resolve(data);
  };

  return m;
};
