const _ = require('lodash');
const Promise = require('bluebird');
const { ObjectId } = require('mongodb');
const mem = require('mem');
const log = require('log4js').getLogger('lib/database-abstraction');
const { AccessError, ValidationError } = require('./errors');
const { getMongoDuplicateErrorMessage, MONGO } = require('./util/util');
const { hashObject } = require('./util/hash');

/**
 * @module database-abstraction
 * This module was create in an attempt to abstract database access from the rest of the code.
 */
module.exports = (appLib) => {
  const { transformers } = appLib;

  const m = {};

  m.isModelSoftDelete = mem((modelName) => !!_.get(appLib.appModel.models, `${modelName}.softDelete`));

  m.getConditionForActualRecord = (modelName) => {
    return m.isModelSoftDelete(modelName) ? { deletedAt: new Date(0) } : {};
  };

  /**
   * Updates ONE document based on mongoConditions
   * This method is tricky because it needs to call transformers and validations on the portion of the document
   * That only sits in the req.body.data
   * @param modelName
   * @param userContext
   * @param mongoConditions
   * @param data
   * @param session
   */
  m.updateItem = async ({ modelName, userContext, mongoConditions, data, session }) => {
    const newConditions = MONGO.and(mongoConditions, m.getConditionForActualRecord(modelName));
    try {
      await transformers.preSaveTransformData(modelName, userContext, data, []);
      const { opResult } = await appLib.db
        .collection(modelName)
        .hookQuery('replaceOne', newConditions, data, { session });
      if (opResult.modifiedCount !== 1) {
        throw new Error(`Unable to update item`);
      }
      await appLib.cache.clearCacheForModel(modelName);
      return data;
    } catch (e) {
      const duplicateErrMsg = getMongoDuplicateErrorMessage(e, appLib.appModel.models);
      if (duplicateErrMsg) {
        log.error(duplicateErrMsg);
        throw new Error(duplicateErrMsg);
      }
      log.error(`Unable to replace '${modelName}' item by conditions: `, newConditions, e.stack);
      if (e instanceof ValidationError) {
        throw e;
      }
      throw new Error('You are not allowed to update the item');
    }
  };

  m.updateItems = async ({ modelName, userContext, items, session }) => {
    const errors = {};

    await Promise.map(items, async (item) => {
      const itemId = item._id.toString();
      const newConditions = MONGO.and({ _id: ObjectId(itemId) }, m.getConditionForActualRecord(modelName));
      try {
        await transformers.preSaveTransformData(modelName, userContext, item, []);
        const { opResult } = await appLib.db
          .collection(modelName)
          .hookQuery('replaceOne', newConditions, item, { session });
        if (opResult.modifiedCount !== 1) {
          errors[itemId] = `Unable to update item`;
        }
      } catch (e) {
        const duplicateErrMsg = getMongoDuplicateErrorMessage(e, appLib.appModel.models);
        if (duplicateErrMsg) {
          log.error(duplicateErrMsg);
          errors[itemId] = duplicateErrMsg;
          return;
        }
        log.error(`Unable to replace '${modelName}' item by conditions: `, newConditions, e.stack);
        if (e instanceof ValidationError) {
          errors[itemId] = e.message;
          return;
        }
        errors[itemId] = 'You are not allowed to update the items';
      }
    });

    await appLib.cache.clearCacheForModel(modelName);

    return errors;
  };

  m.upsertItem = async ({ modelName, userContext, mongoConditions, data, session }) => {
    const { record } = await appLib.db.collection(modelName).hookQuery('findOne', mongoConditions);
    if (record) {
      return m.updateItem({
        modelName,
        userContext,
        mongoConditions,
        data,
        session,
      });
    }
    return m.createItemCheckingConditions(modelName, mongoConditions, userContext, data, session);
  };

  /**
   * Creates/saves new item.
   * This creates whole new item, not just a submodel of existin element, so the transformers and validators should be applied to the whole item
   */
  m.createItem = async (modelName, userContext, origData) => {
    const data = _.cloneDeep(origData);
    await transformers.preSaveTransformData(modelName, userContext, data, []);
    const { record } = await appLib.db.collection(modelName).hookQuery('insertOne', data);
    return record;
  };

  /**
   * Creates item with following steps:
   * 1) Create desired item.
   * 2) Check whether created item is allowed to be created for current user by searching with conditions.
   * This is done in this way because permission scopes contain mongo conditions.
   * Otherwise we would have to implement own condition parser.
   * @param modelName
   * @param data
   * @param mongoConditions
   * @param session
   * @returns {Promise<*>}
   */
  async function saveDocCheckingConditions(modelName, data, mongoConditions, session) {
    const { record } = await appLib.db
      .collection(modelName)
      .hookQuery('insertOne', data, { session, checkKeys: false });

    if (mongoConditions === true) {
      return record;
    }

    const savedItemId = record._id;

    const { record: createdDoc } = await appLib.db
      .collection(modelName)
      .hookQuery('findOne', { ...mongoConditions, _id: savedItemId }, { session });

    if (!createdDoc) {
      throw new AccessError(
        `Not enough permissions to create the item. Conditions: ${JSON.stringify(mongoConditions)}`
      );
    }
    return createdDoc;
  }

  m.createItemCheckingConditions = async (modelName, mongoConditions, userContext, origData, session) => {
    if (mongoConditions === false) {
      throw new AccessError(`Not enough permissions to create the item.`);
    }

    const data = _.cloneDeep(origData);
    await transformers.preSaveTransformData(modelName, userContext, data, []);

    const createdDoc = await saveDocCheckingConditions(modelName, data, mongoConditions, session);
    await appLib.cache.clearCacheForModel(modelName);
    return createdDoc;
  };

  m.removeItem = async (modelName, conditions, session) => {
    const isModelSoftDelete = m.isModelSoftDelete(modelName);
    let record;
    if (isModelSoftDelete) {
      const newConditions = MONGO.and(conditions, m.getConditionForActualRecord(modelName));
      const result = await appLib.db
        .collection(modelName)
        .hookQuery(
          'findOneAndUpdate',
          newConditions,
          { $set: { deletedAt: new Date() } },
          { session, returnOriginal: false, checkKeys: false }
        );
      record = result.record;
    } else {
      const result = await appLib.db
        .collection(modelName)
        .hookQuery('findOneAndDelete', conditions, { session, checkKeys: false });
      record = result.record;
    }

    await appLib.cache.clearCacheForModel(modelName);
    return record;
  };

  m.removeItems = async (modelName, conditions, session) => {
    const isModelSoftDelete = m.isModelSoftDelete(modelName);
    if (isModelSoftDelete) {
      const newConditions = MONGO.and(conditions, m.getConditionForActualRecord(modelName));
      const result = await appLib.db
        .collection(modelName)
        .hookQuery('updateMany', newConditions, { $set: { deletedAt: new Date() } }, { session, checkKeys: false });
      return result.opResult.modifiedCount;
    }

    const result = await appLib.db
      .collection(modelName)
      .hookQuery('deleteMany', conditions, { session, checkKeys: false });

    await appLib.cache.clearCacheForModel(modelName);

    return result.opResult.deletedCount;
  };

  m.aggregateItems = async ({ modelName, mongoParams = {} }) => {
    let { conditions = {} } = mongoParams;
    const conditionForActualRecord = m.getConditionForActualRecord(modelName);
    conditions = MONGO.and(conditions, conditionForActualRecord);
    if (conditions === false) {
      return [];
    }
    if (conditions === true) {
      conditions = {};
    }

    const pipeline = [{ $match: conditions }];

    const { projections = {}, sort = {}, skip = 0, limit = -1 } = mongoParams;
    if (!_.isEmpty(sort)) {
      pipeline.push({ $sort: sort });
    }
    pipeline.push({ $skip: skip });
    if (limit > 0) {
      pipeline.push({ $limit: limit });
    }

    if (!_.isEmpty(projections)) {
      pipeline.push({ $project: projections });
    }

    // add allowDiskUse for sorting big collections
    return appLib.db.collection(modelName).aggregate(pipeline, { allowDiskUse: true }).toArray();
  };

  m.aggregatePipeline = ({ modelName, pipeline }) => {
    return appLib.db.collection(modelName).aggregate(pipeline, { allowDiskUse: true }).toArray();
  };

  m.getPreparedItems = async ({ modelName, userContext, mongoParams, actionFuncs }) => {
    const docs = await m.aggregateItems({ modelName, mongoParams });
    const docsWithActions = appLib.accessUtil.addActionsToDocs(docs, actionFuncs);
    return m.postTransform(docsWithActions, modelName, userContext);
  };

  m.getItemsUsingCache = async ({ modelName, userContext, mongoParams, actionFuncs }) => {
    const getPromise = () => m.aggregateItems({ modelName, mongoParams });

    let docs;
    try {
      const paramHash = hashObject(mongoParams);
      const cacheKey = `${modelName}:get:${paramHash}`;
      docs = await appLib.cache.getUsingCache(getPromise, cacheKey);
    } catch (e) {
      log.warn(`Unable to hash params to get hash key. Cache will not be used.`, mongoParams, e.stack);
      docs = await getPromise();
    }

    const docsWithActions = appLib.accessUtil.addActionsToDocs(docs, actionFuncs);
    return m.postTransform(docsWithActions, modelName, userContext);
  };

  m.postTransform = async (data, modelName, userContext, changesPath) => {
    if (_.isEmpty(data)) {
      return data;
    }
    await Promise.mapSeries(data, (el) => transformers.postInitTransformData(modelName, userContext, el, changesPath));
    return data;
  };

  m.getDocumentsCount = (modelName, conditions) => {
    const countConditions = MONGO.and(conditions, m.getConditionForActualRecord(modelName));
    if (countConditions === false) {
      return 0;
    }
    const finalConditions = countConditions === true ? {} : countConditions;
    return appLib.db.collection(modelName).countDocuments(finalConditions);
  };

  m.getDocumentsCountUsingCache = (modelName, conditions) => {
    let cacheKey;
    try {
      const paramHash = hashObject(conditions);
      cacheKey = `${modelName}:count:${paramHash}`;
    } catch (e) {
      log.warn(`Unable to hash params to get hash key. Cache will not be used.`, conditions, e.stack);
      return m.getDocumentsCount(modelName, conditions);
    }

    const getPromise = () => m.getDocumentsCount(modelName, conditions);
    return appLib.cache.getUsingCache(getPromise, cacheKey);
  };

  /**
   * Executes fn in transaction if its allowed by current mongo configuration
   * @param fn - function returning Promise
   */
  m.withTransaction = async (fn) => {
    if (!appLib.isMongoSupportsSessions) {
      return fn();
    }

    const session = await appLib.connection.startSession();
    session.startTransaction();

    try {
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  };

  return m;
};
