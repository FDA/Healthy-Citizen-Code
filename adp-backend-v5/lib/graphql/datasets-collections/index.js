const log = require('log4js').getLogger('lib/graphql-datasets');
const { ObjectID } = require('mongodb');
const Promise = require('bluebird');
const ms = require('ms');

const { getOrCreateTypeByModel } = require('../type/model');
const {
  createOneResolverName,
  deleteOneResolverName,
  updateOneResolverName,
  deleteOutputType,
  getMongoParams,
} = require('../mutation');
const GraphQlContext = require('../../request-context/graphql/GraphQlContext');
const { COMPOSER_TYPES, MongoIdITC, dxQueryInputRequired } = require('../type/common');
const {
  getExternalDatasetsModelName,
  addQueriesAndMutationsForDatasetsRecord,
  getNewSchemeByProjections,
  getCloneRecordsPipeline,
  removeQueriesAndMutationsForDatasetsRecord,
} = require('./util');
const { handleGraphQlError } = require('../util');

const datasetExpirationTime = process.env.DATASET_RESOLVERS_EXPIRATION_TIME || '24h';
const datasetExpirationTimeMs = ms(datasetExpirationTime);
const cloneResolverName = 'clone';

module.exports = ({ appLib, datasetsModelName }) => {
  const m = {};
  m.datasetResolversInfo = {};
  const datasetsModel = appLib.appModel.models[datasetsModelName];
  const { addDefaultQueries, addDefaultMutations, removeDefaultQueries, removeDefaultMutations } = appLib.graphQl;

  m.updateDatasetExpirationTimeout = (datasetId) => {
    const now = new Date();
    if (m.datasetResolversInfo[datasetId]) {
      clearTimeout(m.datasetResolversInfo[datasetId].expirationTimeout);
    } else {
      m.datasetResolversInfo[datasetId] = { createdAt: now };
    }
    m.datasetResolversInfo[datasetId] = {
      updatedAt: now,
      expirationTimeout: setTimeout(
        () =>
          removeQueriesAndMutationsForDatasetsRecord(appLib, datasetId, removeDefaultQueries, removeDefaultMutations),
        datasetExpirationTimeMs
      ),
    };
    log.info(`Added a timeout(${datasetExpirationTime}) for removing dataset resolvers with id ${datasetId}`);
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
          addQueriesAndMutationsForDatasetsRecord(datasetRecord, appLib, addDefaultQueries, addDefaultMutations)
        );
        datasetRecords = [];
      }
    }
    datasetRecords.length &&
      (await Promise.map(datasetRecords, (record) =>
        addQueriesAndMutationsForDatasetsRecord(record, appLib, addDefaultQueries, addDefaultMutations)
      ));

    appLib.graphQl.connect.rebuildGraphQlSchema();
  };

  m.datasetsResolvers = {};

  const type = getOrCreateTypeByModel(datasetsModel, datasetsModelName, COMPOSER_TYPES.OUTPUT);
  const recordInputType = getOrCreateTypeByModel(datasetsModel, datasetsModelName, COMPOSER_TYPES.INPUT_WITHOUT_ID);

  type.addResolver({
    kind: 'mutation',
    name: createOneResolverName,
    args: { record: recordInputType },
    type,
    resolve: async ({ args, context }) => {
      try {
        const { req } = context;
        const graphQlContext = await new GraphQlContext(appLib, req, datasetsModelName, args).init();
        // no filtering for create record
        graphQlContext.mongoParams = { conditions: {} };
        // nullify scheme since we can't check if it's valid for now
        const datasetsId = ObjectID();
        args.record.collectionName = getExternalDatasetsModelName(datasetsId);
        const datasetsRecord = { ...args.record, _id: datasetsId };

        const createdDatasetsRecord = await appLib.dba.withTransaction((session) =>
          appLib.controllerUtil.postItem(graphQlContext, datasetsRecord, session)
        );

        await appLib.db.createCollection(datasetsRecord.collectionName);

        m.updateDatasetExpirationTimeout(datasetsId);
        return createdDatasetsRecord;
      } catch (e) {
        handleGraphQlError(e, `Unable to create record`, log, appLib);
      }
    },
  });
  m.datasetsResolvers.createOne = type.getResolver(createOneResolverName);

  type.addResolver({
    kind: 'mutation',
    name: cloneResolverName,
    args: {
      record: recordInputType,
      parentCollectionName: 'String!',
      filter: dxQueryInputRequired,
      projections: '[String]!',
    },
    type,
    resolve: async ({ args, context }) => {
      const { req } = context;
      const { record, projections, parentCollectionName, filter } = args;

      try {
        const graphQlContext = await new GraphQlContext(appLib, req, datasetsModelName, args).init();
        // no filtering for create record
        graphQlContext.mongoParams = { conditions: {} };

        const datasetsObjectId = ObjectID();
        const datasetId = datasetsObjectId.toString();
        const externalDatasetModelName = getExternalDatasetsModelName(datasetId);
        record.collectionName = externalDatasetModelName;
        const { parentCollectionScheme, newScheme, newSchemeFields } = await getNewSchemeByProjections({
          datasetsModelName,
          externalDatasetModelName,
          appLib,
          parentCollectionName,
          projections,
          fixLookupIdDuplicates: appLib.mutil.fixLookupIdDuplicates,
        });
        const datasetsItem = { _id: datasetsObjectId, ...record, scheme: newScheme };

        const { userPermissions, inlineContext } = graphQlContext;
        const pipeline = await getCloneRecordsPipeline({
          appLib,
          parentCollectionScheme,
          userPermissions,
          inlineContext,
          filter,
          newSchemeFields,
          outCollectionName: datasetsItem.collectionName,
        });

        const createdDatasetsRecord = await appLib.dba.withTransaction((session) =>
          appLib.controllerUtil.cloneItem(graphQlContext, datasetsItem, session)
        );

        const cloneRecordsPromise = appLib.db.collection(parentCollectionName).aggregate(pipeline).toArray();

        // Error occurred if cloning records is in process simultaneously with creating indexes:
        // "Unhandled rejection MongoError: indexes of target collection oraimports-prototype.testDataset_asd changed during processing."
        // So add graphql and prepare scheme(create indexes etc) after cloning
        // TODO: do not await in future since it may take much time. add it to job queue?
        await cloneRecordsPromise;
        await addQueriesAndMutationsForDatasetsRecord(
          createdDatasetsRecord,
          appLib,
          addDefaultQueries,
          addDefaultMutations
        );
        m.updateDatasetExpirationTimeout(datasetId);
        appLib.graphQl.connect.rebuildGraphQlSchema();

        return createdDatasetsRecord;
      } catch (e) {
        handleGraphQlError(e, `Unable to clone record`, log, appLib);
      }
    },
  });
  m.datasetsResolvers.cloneOne = type.getResolver(cloneResolverName);

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
        const deletedDoc = await appLib.dba.withTransaction((session) =>
          appLib.controllerUtil.deleteItem(graphQlContext, session)
        );

        removeQueriesAndMutationsForDatasetsRecord(
          appLib,
          deletedDoc._id,
          removeDefaultQueries,
          removeDefaultMutations
        );
        // dropping is done immediately with collection of any size
        await appLib.db.collection(deletedDoc.collectionName).drop();

        return { deletedCount: 1 };
      } catch (e) {
        handleGraphQlError(e, `Unable to delete record`, log, appLib);
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
        const { req } = context;
        const graphQlContext = await new GraphQlContext(appLib, req, datasetsModelName, args).init();
        graphQlContext.mongoParams = getMongoParams(args);
        const datasetRecord = await appLib.dba.withTransaction((session) =>
          appLib.controllerUtil.putItem(graphQlContext, args.record, session)
        );

        await addQueriesAndMutationsForDatasetsRecord(datasetRecord, appLib, addDefaultQueries, addDefaultMutations);
        const datasetId = datasetRecord._id.toString();
        m.updateDatasetExpirationTimeout(datasetId);
        appLib.graphQl.connect.rebuildGraphQlSchema();

        return datasetRecord;
      } catch (e) {
        handleGraphQlError(e, `Unable to update record`, log, appLib);
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
        handleGraphQlError(e, `Unable to get requested dataset`, log, appLib);
      }
    },
  });
  m.datasetsResolvers.getSingleDataset = type.getResolver(getSingleDatasetResolverName);

  return m;
};
