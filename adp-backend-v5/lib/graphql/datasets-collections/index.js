const log = require('log4js').getLogger('lib/graphql-datasets');
const { ObjectID } = require('mongodb');
const _ = require('lodash');
const Promise = require('bluebird');

const { getOrCreateTypeByModel } = require('../type/model');
const {
  createOneResolverName,
  deleteOneResolverName,
  updateOneResolverName,
  deleteOutputType,
  getMongoParams,
} = require('../mutation');
const GraphQlContext = require('../../request-context/graphql/GraphQlContext');
const { ValidationError } = require('../../errors');
const { COMPOSER_TYPES, MongoIdITC } = require('../type/common');
const {
  getDatasetRecordSchemaName,
  addQueriesAndMutationsForDatasetsRecord,
  removeQueriesAndMutationsForDatasetsRecord,
  datasetsModelName,
} = require('./util');
const { handleGraphQlError } = require('../util');

module.exports = ({ appLib }) => {
  const m = {};
  const { DATASET_RESOLVERS_EXPIRATION_TIME } = appLib.config;

  m.datasetResolversInfo = {};
  const datasetsModel = appLib.appModel.models[datasetsModelName];

  m.datasetsModelName = datasetsModelName;
  m.updateDatasetExpirationTimeout = (datasetRecord) => {
    const now = new Date();
    const datasetId = datasetRecord._id.toString();
    if (m.datasetResolversInfo[datasetId]) {
      clearTimeout(m.datasetResolversInfo[datasetId].expirationTimeout);
    } else {
      m.datasetResolversInfo[datasetId] = { createdAt: now };
    }
    m.datasetResolversInfo[datasetId] = {
      updatedAt: now,
      expirationTimeout: setTimeout(
        () => removeQueriesAndMutationsForDatasetsRecord(appLib, datasetRecord),
        DATASET_RESOLVERS_EXPIRATION_TIME
      ),
    };
    log.info(
      `Added a timeout(${DATASET_RESOLVERS_EXPIRATION_TIME}) for removing dataset resolvers with id ${datasetId}`
    );
  };

  m.transformDatasetsRecord = async (datasetsRecord, userPermissions, inlineContext) => {
    const { scheme } = datasetsRecord;
    if (scheme) {
      const { removeBaseAppModelPart, handleModelByPermissions, injectListValuesForModel } = appLib.accessUtil;
      removeBaseAppModelPart(scheme);
      handleModelByPermissions(scheme, userPermissions);

      await injectListValuesForModel(userPermissions, inlineContext, scheme);
    }
    return datasetsRecord;
  };

  // This method is not in use anymore since it might be ten of thousands of datasets so it might take much time to create all the resolvers.
  m.addQueriesAndMutationsForDatasetsInDb = async () => {
    // create resolvers for the datasets collections "pretending" that they are normal collections
    const datasetsRecordsCursor = appLib.db
      .collection(datasetsModelName)
      .find({ scheme: { $ne: null }, ...appLib.dba.getConditionForActualRecord(datasetsModelName) });

    let datasetRecords = [];
    for await (const record of datasetsRecordsCursor) {
      datasetRecords.push(record);
      if (datasetRecords.length >= 50) {
        await Promise.map(datasetRecords, (datasetRecord) =>
          addQueriesAndMutationsForDatasetsRecord(appLib, datasetRecord)
        );
        datasetRecords = [];
      }
    }
    datasetRecords.length &&
      (await Promise.map(datasetRecords, (record) => addQueriesAndMutationsForDatasetsRecord(appLib, record)));

    appLib.graphQl.connect.rebuildGraphQlSchema();
  };

  m.datasetsResolvers = {};

  const type = getOrCreateTypeByModel(datasetsModel, datasetsModelName, COMPOSER_TYPES.OUTPUT);
  const recordInputType = getOrCreateTypeByModel(datasetsModel, datasetsModelName, COMPOSER_TYPES.INPUT_WITHOUT_ID);

  async function checkIsValidCollectionName(collectionName) {
    // same message for all cases to forbid scanning collection names
    const errorMessage = 'Invalid collectionName specified';
    // More - https://docs.mongodb.com/manual/reference/limits/#mongodb-limit-Restriction-on-Collection-Names
    const isInvalidName =
      !_.isString(collectionName) ||
      !collectionName ||
      collectionName.includes('$') ||
      collectionName.startsWith('system.');
    if (isInvalidName) {
      throw new ValidationError(errorMessage);
    }
    const isCollectionExist = await appLib.db.listCollections({ name: collectionName }, { nameOnly: true }).hasNext();
    if (isCollectionExist) {
      throw new ValidationError(errorMessage);
    }
  }

  type.addResolver({
    kind: 'mutation',
    name: createOneResolverName,
    args: { record: recordInputType },
    type,
    resolve: async ({ args, context }) => {
      try {
        await checkIsValidCollectionName(args.record.collectionName);

        const { req } = context;
        const graphQlContext = await new GraphQlContext(appLib, req, datasetsModelName, args).init();
        // nullify scheme since we can't check if it's valid for now
        const datasetsId = ObjectID();
        const datasetsRecord = { ...args.record, _id: datasetsId };
        _.set(datasetsRecord, 'scheme.schemaName', getDatasetRecordSchemaName(datasetsRecord._id));
        _.set(datasetsRecord, 'scheme.collectionName', datasetsRecord.collectionName);

        const createdDatasetRecord = await appLib.dba.withTransaction(async (session) => {
          const createdRecord = await appLib.controllerUtil.postItem(graphQlContext, datasetsRecord, session);
          // try to add graphql stuff, transaction will be aborted on invalid dataset scheme
          await addQueriesAndMutationsForDatasetsRecord(appLib, createdRecord);
          return createdRecord;
        });
        await appLib.trino.upsertTrinoSchema(createdDatasetRecord.scheme);

        // addQueriesAndMutationsForDatasetsRecord creates indexes and thus creates a collection,
        // but if there is no any indexes for collection create it with createCollection
        try {
          await appLib.db.createCollection(createdDatasetRecord.collectionName);
        } catch (e) {
          if (e.codeName !== 'NamespaceExists') {
            throw e;
          }
        }
        m.updateDatasetExpirationTimeout(createdDatasetRecord);
        return createdDatasetRecord;
      } catch (e) {
        handleGraphQlError({ e, message: `Unable to create record`, log, appLib, modelName: datasetsModelName });
      }
    },
  });
  m.datasetsResolvers.createOne = type.getResolver(createOneResolverName);

  type.addResolver({
    kind: 'mutation',
    name: deleteOneResolverName,
    args: {
      filter: MongoIdITC.getTypeNonNull(),
    },
    type: deleteOutputType,
    resolve: async ({ args, context }) => {
      try {
        const { req } = context;
        const graphQlContext = await new GraphQlContext(appLib, req, datasetsModelName, args).init();
        graphQlContext.mongoParams = getMongoParams(args);
        const deletedDataset = await appLib.dba.withTransaction((session) =>
          appLib.controllerUtil.deleteItem(graphQlContext, session)
        );

        removeQueriesAndMutationsForDatasetsRecord(appLib, deletedDataset);
        // dropping is done immediately with collection of any size
        await appLib.db.collection(deletedDataset.collectionName).drop();
        await appLib.trino.removeTrinoSchema(deletedDataset.collectionName);

        return { deletedCount: 1 };
      } catch (e) {
        handleGraphQlError({ e, message: `Unable to delete record`, log, appLib, modelName: datasetsModelName });
      }
    },
  });
  m.datasetsResolvers.deleteOne = type.getResolver(deleteOneResolverName);

  type.addResolver({
    kind: 'mutation',
    name: updateOneResolverName,
    args: {
      filter: MongoIdITC.getTypeNonNull(),
      record: recordInputType,
    },
    type,
    resolve: async ({ args, context }) => {
      try {
        const { record } = args;

        const { req } = context;
        const graphQlContext = await new GraphQlContext(appLib, req, datasetsModelName, args).init();
        graphQlContext.mongoParams = getMongoParams(args);

        const updatedDatasetRecord = await appLib.dba.withTransaction(async (session) => {
          const { items } = await appLib.controllerUtil.getElements({ context: graphQlContext });
          const currentRecord = items[0];
          if (!currentRecord) {
            throw new ValidationError(`Unable to update record`);
          }

          _.set(record, 'scheme.collectionName', record.collectionName);
          _.set(record, 'scheme.schemaName', currentRecord.scheme.schemaName);
          const isSameCollectionName = currentRecord.collectionName === record.collectionName;
          if (!isSameCollectionName) {
            await checkIsValidCollectionName(record.collectionName);
          }

          // set mandatory _id field
          const _idField = currentRecord.scheme.fields._id;
          let fields = _.get(record, 'scheme.fields');
          if (_.isPlainObject(fields)) {
            fields._id = _idField;
          } else {
            fields = { _id: _idField };
          }
          _.set(record, 'scheme.fields', fields);

          const updatedRecord = await appLib.controllerUtil.putItem(graphQlContext, record, session);

          const schemeFieldNames = _.keys(updatedRecord.scheme.fields);
          const isCompleteScheme = schemeFieldNames.length === 1 && schemeFieldNames[0] === '_id';
          if (isCompleteScheme) {
            removeQueriesAndMutationsForDatasetsRecord(appLib, updatedRecord);
          } else {
            await addQueriesAndMutationsForDatasetsRecord(appLib, updatedRecord);
          }

          if (!isSameCollectionName) {
            await appLib.mutil.renameCollection({
              fromCollection: currentRecord.collectionName,
              toCollection: updatedRecord.collectionName,
              options: { dropTarget: true },
            });
          }
          await appLib.trino.upsertTrinoSchemaForCollection(updatedRecord.scheme, currentRecord.collectionName);

          return updatedRecord;
        });

        m.updateDatasetExpirationTimeout(updatedDatasetRecord);
        appLib.graphQl.connect.rebuildGraphQlSchema();

        return updatedDatasetRecord;
      } catch (e) {
        handleGraphQlError({ e, message: `Unable to update record`, log, appLib, modelName: datasetsModelName });
      }
    },
  });
  m.datasetsResolvers.updateOne = type.getResolver(updateOneResolverName);

  const getSingleDatasetResolverName = 'getSingleDataset';
  type.addResolver({
    kind: 'query',
    name: getSingleDatasetResolverName,
    args: {
      filter: MongoIdITC.getTypeNonNull(),
    },
    type,
    resolve: async ({ args, context }) => {
      try {
        const { req } = context;

        const { controllerUtil } = appLib;
        const graphQlContext = new GraphQlContext(appLib, req, datasetsModelName, args).init();
        graphQlContext.mongoParams = { conditions: { _id: args.filter._id } };

        const { items } = await controllerUtil.getItems(graphQlContext);
        const dataset = items[0];

        if (dataset) {
          const { userPermissions, inlineContext } = graphQlContext;
          await m.transformDatasetsRecord(dataset, userPermissions, inlineContext);
        }

        return dataset;
      } catch (e) {
        handleGraphQlError({
          e,
          message: `Unable to get requested dataset`,
          log,
          appLib,
          modelName: datasetsModelName,
        });
      }
    },
  });
  m.datasetsResolvers.getSingleDataset = type.getResolver(getSingleDatasetResolverName);

  return m;
};
