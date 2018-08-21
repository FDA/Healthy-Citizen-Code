const _ = require('lodash');
const log = require('log4js').getLogger('lib/database-abstraction');

/**
 * @module database-abstraction
 * This module was create in an attempt to abstract database access from the rest of the code.
 * The primary reason is that mongoose is doing terrible job with middleware, so we need to call
 * pre and post hooks manually.
 * Overall it would be great to get rid of mongoose completely and work directly with the driver.
 * This will be possible with further expansion of this module.
 */
module.exports = function (appLib) {
  const transformers = require('./transformers')(appLib);
  const m = {};

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
   * @param mongoConditions
   * @param origData associative array containing the data to be updated
   * @param path the path to the element of appModel that's being updated ("" if the entire record is being updated)
   * @param cb
   */
  m.updateItem = (action, model, userContext, mongoConditions, mongoProjections, origData, path) => {
    let data = _.cloneDeep(origData);
    //log.trace(`${action} ${path} ${JSON.stringify(origData, null, 4)}`);
    return transformers.preSaveTransformData(model.modelName, userContext, data, /*[]*/path)
      .then(() => {
        const newConditions = Object.assign(mongoConditions, {deletedAt: {$eq: null}, _temporary: {$eq: null}});
        return model.findOneAndUpdate(newConditions, data, { new: true, strict: true });
      })
      .then((doc) => {
        if (!doc) {
          throw new Error('You are not allowed to update the item');
        }
      })
  };

  m.upsertItem = (action, model, userContext, mongoConditions, mongoProjections, origData, path) => {
    return model.findOne(mongoConditions)
      .then((doc) => {
        if (doc) {
          return m.updateItem(action, model, userContext, mongoConditions, mongoProjections, origData, path);
        }
        return m.createItemCheckingConditions(model, mongoConditions, userContext, origData);
      });
  };

  /**
   * Creates/saves new item.
   * This creates whole new item, not just a submodel of existin element, so the transformers and validators should be applied to the whole item
   */
  m.createItem = (model, userContext, origData) => {
    let data = _.cloneDeep(origData);
    return transformers.preSaveTransformData(model.modelName, userContext, data, [])
      .then(() => {
        // Used for preserving key order in objects.
        // Recommendation from one of authors: https://github.com/Automattic/mongoose/issues/2749#issuecomment-234737744
        model.schema.options.retainKeyOrder = true;
        let record = new model(data);
        return record.save();
      })
  };

  /**
   * Creates item with following steps:
   * 1) Create desired item with temporary flag.
   * 2) Check whether created temporary item is allowed to be created for current user.
   * 3) Remove temporary flag from created record if its allowed.
   * 4) Otherwise remove whole temporary record.
   * This is done in this way because permission scopes contain mongo conditions.
   * Otherwise we would have to implement own condition parser.
   * @param model
   * @param mongoConditions
   * @param userContext
   * @param origData
   */
  m.createItemCheckingConditions = (model, mongoConditions, userContext, origData) => {
    let data = _.cloneDeep(origData);
    let savedItem;

    return transformers.preSaveTransformData(model.modelName, userContext, data, [])
      .then(() => {
        // Used for preserving key order in objects.
        // Recommendation from one of authors: https://github.com/Automattic/mongoose/issues/2749#issuecomment-234737744
        model.schema.options.retainKeyOrder = true;
        data._temporary = true;
        let record = new model(data);
        return record.save();
      })
      .then(item => {
        savedItem = item;
        return model.findOneAndUpdate(
          {...mongoConditions, _temporary: true, _id: item._id},
          {$unset: {_temporary: 1}},
          {new: true})
      })
      .then(newDoc => {
        if (!newDoc) {
          // remove temporary record immediately
          return model.remove({_id: savedItem._id, _temporary: true})
            .then(() => {
              throw new Error(`Not authorized to save the item.`);
            });
        }
        return newDoc;
      });
  };

  m.removeItem = (model, conditions, cb) => {
    // model.remove({_id: conditions._id}, cb);
    model.findOneAndUpdate({
      ...conditions,
      deletedAt: {$eq: null},
      _temporary: {$eq: null}
    }, {$set: {deletedAt: new Date()}}, (err) => {
      if (err) {
        log.error(`Unable to remove item: ${err}`);
        cb('Internal Server Error');
      } else {
        cb();
      }
    });
  };

// TODO: rewrite using cursors?
  m.findItems = (model, userContext, conditions = {}, projections = {}, sort = {}, skip = 0, limit = -1, runPostprocessing = true) => {
    // build new conditions for skipping soft deleted parent records
    Object.assign(conditions, {deletedAt: {$eq: null}, _temporary: {$eq: null}});
    let foundData;
    return model.find(conditions).sort(sort).skip(skip).limit(limit).lean().exec()
      .then((data) => {
        if (data) {
          foundData = data;
          transformers.removeSoftDeletedSubschemaElements(appLib.appModel.models[model.modelName], foundData);

          if (runPostprocessing) {// some operations like putItems require postprocessing to be skipped
            return Promise.map(foundData, (el) => transformers.postInitTransformData(model.modelName, userContext, el));
          }
        }
      })
      .then(() => foundData)
  };

  m.aggregateItems = (model, userContext, conditions = {}, projections = {}, sort = {}, skip = 0, limit = -1, runPostprocessing = true) => {
    // build new conditions for skipping soft deleted parent records
    const newConditions = {$and: [conditions, {deletedAt: {$eq: null}, _temporary: {$eq: null}}]};

    let aggregate = model.aggregate().match(newConditions);
    if (Object.keys(projections).length > 0) {
      aggregate = aggregate.project(projections);
    }
    if (Object.keys(sort).length > 0) {
      aggregate = aggregate.sort(sort);
    }
    aggregate = aggregate.skip(skip);
    if (limit > 0) {
      aggregate = aggregate.limit(limit);
    }

    return aggregate.exec()
      .then(data => {
        if (!_.isEmpty(data)) {
          transformers.removeSoftDeletedSubschemaElements(appLib.appModel.models[model.modelName], data);
          if (runPostprocessing) {
            // some operations like putItems require postprocessing to be skipped
            return Promise.mapSeries(data, (el) => transformers.postInitTransformData(model.modelName, userContext, el))
              .then(() => data);
          }
        }
        return data;
      });
  };

  return m;
};
