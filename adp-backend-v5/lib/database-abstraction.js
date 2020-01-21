const mongoose = require('mongoose');
const _ = require('lodash');
const Promise = require('bluebird');
const log = require('log4js').getLogger('lib/database-abstraction');
const { AccessError, ValidationError } = require('./errors');

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

  m.getConditionForActualRecord = () => ({ deletedAt: new Date(0) });

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
  m.updateItem = async ({ model, userContext, mongoConditions, data, session }) => {
    const newConditions = MONGO.and(mongoConditions, m.getConditionForActualRecord());
    try {
      await transformers.preSaveTransformData(model.modelName, userContext, data, []);
      const stats = await model.replaceOne(newConditions, data, { session });
      if (stats.ok !== 1 || stats.nModified < 1) {
        throw new Error(`Unable to update item`);
      }
      await appLib.cache.clearCacheForModel(model.modelName);
      return data;
    } catch (e) {
      log.error(`Unable to replace '${model.modelName}' item by conditions: `, newConditions, e.stack);
      if (e instanceof ValidationError) {
        throw e;
      }
      throw new Error('You are not allowed to update the item');
    }
  };

  m.upsertItem = async ({ model, userContext, mongoConditions, data, session }) => {
    const doc = await model.findOne(mongoConditions);
    if (doc) {
      return m.updateItem({
        model,
        userContext,
        mongoConditions,
        data,
        session,
      });
    }
    return m.createItemCheckingConditions(model, mongoConditions, userContext, data, session);
  };

  /**
   * Creates/saves new item.
   * This creates whole new item, not just a submodel of existin element, so the transformers and validators should be applied to the whole item
   */
  m.createItem = async (Model, userContext, origData) => {
    const data = _.cloneDeep(origData);
    await transformers.preSaveTransformData(Model.modelName, userContext, data, []);
    // Used for preserving key order in objects.
    // Recommendation from one of authors: https://github.com/Automattic/mongoose/issues/2749#issuecomment-234737744
    Model.schema.options.retainKeyOrder = true;
    const record = new Model(data);
    return record.save();
  };

  /**
   * Creates item with following steps:
   * 1) Create desired item.
   * 2) Check whether created item is allowed to be created for current user by searching with conditions.
   * This is done in this way because permission scopes contain mongo conditions.
   * Otherwise we would have to implement own condition parser.
   * @param Model
   * @param data
   * @param mongoConditions
   * @param session
   * @returns {Promise<*>}
   */
  async function saveDocCheckingConditions(Model, data, mongoConditions, session) {
    const record = new Model(data);
    record.$session(session);

    const item = await record.save();
    const savedItemId = item._id;

    const createdDoc = await Model.findOne({ ...mongoConditions, _id: savedItemId }, {}, { session });

    if (!createdDoc) {
      throw new AccessError(
        `Not enough permissions to create the item. Conditions: ${JSON.stringify(mongoConditions)}`
      );
    }
    return createdDoc.toObject();
  }

  m.createItemCheckingConditions = async (Model, mongoConditions, userContext, origData, session) => {
    if (mongoConditions === false) {
      throw new AccessError(`Not enough permissions to create the item.`);
    }

    const data = _.cloneDeep(origData);
    await transformers.preSaveTransformData(Model.modelName, userContext, data, []);
    // Used for preserving key order in objects.
    // Recommendation from one of authors: https://github.com/Automattic/mongoose/issues/2749#issuecomment-234737744
    Model.schema.options.retainKeyOrder = true;
    let createdDoc;
    if (mongoConditions === true) {
      const record = new Model(data);
      record.$session(session);
      await record.save();
      createdDoc = record.toObject();
    } else {
      createdDoc = await saveDocCheckingConditions(Model, data, mongoConditions, session);
    }
    await appLib.cache.clearCacheForModel(Model.modelName);
    return createdDoc;
  };

  m.removeItem = async (Model, conditions, session) => {
    const newConditions = MONGO.and(conditions, m.getConditionForActualRecord());
    const updatedDoc = await Model.findOneAndUpdate(
      newConditions,
      { $set: { deletedAt: new Date() } },
      { session, new: true }
    );
    await appLib.cache.clearCacheForModel(Model.modelName);
    return updatedDoc;
  };

  m.aggregateItems = async ({ model, mongoParams = {} }) => {
    let { conditions = {} } = mongoParams;
    const conditionForActualRecord = m.getConditionForActualRecord();
    conditions = MONGO.and(conditions, conditionForActualRecord);
    if (conditions === false) {
      return [];
    }
    if (conditions === true) {
      conditions = {};
    }

    const aggregate = model.aggregate().match(conditions);

    // issue with using index for match: https://jira.mongodb.org/browse/SERVER-7568
    // workaround is to use $addFields or $project between $match and $sort: https://jira.mongodb.org/browse/SERVER-7568?focusedCommentId=814169&page=com.atlassian.jira.plugin.system.issuetabpanels%3Acomment-tabpanel#comment-814169
    if (!_.isEqual(conditions, conditionForActualRecord)) {
      // if conditions are more complicated than conditionForActualRecord, then split $match and $sort with $addFields to use index for $match
      aggregate.addFields({ _addFields_: 1 });
    }

    const { projections = {}, sort = {}, skip = 0, limit = -1 } = mongoParams;
    if (!_.isEmpty(sort)) {
      aggregate.sort(sort);
    }
    aggregate.skip(skip);
    if (limit > 0) {
      aggregate.limit(limit);
    }

    if (!_.isEmpty(projections)) {
      aggregate.project(projections);
    } else {
      aggregate.project({ _addFields_: 0 });
    }
    return aggregate.exec();
  };

  m.aggregatePipeline = ({ model, pipeline }) => {
    return model.aggregate(pipeline).exec();
  };

  m.getPreparedItems = async ({ model, userContext, mongoParams, actionFuncs }) => {
    const docs = await m.aggregateItems({ model, mongoParams });
    const docsWithActions = appLib.accessUtil.addActionsToDocs(docs, actionFuncs);
    return m.postTransform(docsWithActions, model.modelName, userContext);
  };

  m.getItemsUsingCache = ({ model, userContext, mongoParams, actionFuncs }) => {
    const getPromise = () =>
      m.getPreparedItems({
        model,
        userContext,
        mongoParams,
        actionFuncs,
      });

    let cacheKey;
    try {
      const paramHash = hashObject(mongoParams);
      cacheKey = `${model.modelName}:${paramHash}`;
    } catch (e) {
      log.warn(`Unable to hash params to get hash key. Cache will not be used.`, mongoParams, e.stack);
      return getPromise();
    }

    return appLib.cache.getUsingCache(getPromise, cacheKey);
  };

  m.postTransform = async (data, modelName, userContext) => {
    if (_.isEmpty(data)) {
      return data;
    }
    await Promise.mapSeries(data, el => transformers.postInitTransformData(modelName, userContext, el));
    return data;
  };

  m.getCountDocuments = (model, conditions) => {
    const finalConditions = MONGO.and(conditions, m.getConditionForActualRecord());
    if (!finalConditions) {
      return 0;
    }
    return model.collection.countDocuments(finalConditions);
  };

  /**
   * Executes fn in transaction if its allowed by current mongo configuration
   * @param fn - function returning Promise
   */
  m.withTransaction = async fn => {
    if (!appLib.isMongoReplicaSet) {
      return fn();
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await fn(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      throw e;
    }
  };

  return m;
};
