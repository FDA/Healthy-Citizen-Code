const log = require('log4js').getLogger('lib/graphql-datasets');
const { ObjectID } = require('mongodb');

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
  getExternalDatasetsMongooseModelName,
  addQueriesAndMutationsForDatasetsRecord,
  getNewSchemeByProjections,
  getCloneRecordsPipeline,
  removeQueriesAndMutationsForDatasetsRecord,
} = require('./util');
const { handleGraphQlError } = require('../util');

const cloneResolverName = 'clone';

module.exports = ({
  appLib,
  datasetsModel,
  datasetsModelName,
  addDefaultQueries,
  addDefaultMutations,
  removeDefaultQueries,
  removeDefaultMutations,
}) => {
  const m = {};

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

  m.addQueriesAndMutationsForDatasetsInDb = async () => {
    // create resolvers for the datasets collections "pretending" that they are normal collections
    const datasetsRecordsCursor = appLib.db
      .collection(datasetsModelName)
      .find({ scheme: { $ne: null }, ...appLib.dba.getConditionForActualRecord() });

    for await (const record of datasetsRecordsCursor) {
      await addQueriesAndMutationsForDatasetsRecord(record, appLib, addDefaultQueries, addDefaultMutations);
    }

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
        args.record.collectionName = getExternalDatasetsMongooseModelName(datasetsId);
        const datasetsRecord = { _id: datasetsId, ...args.record, scheme: null };

        const createdDatasetsRecord = await appLib.dba.withTransaction((session) =>
          appLib.controllerUtil.postItem(graphQlContext, datasetsRecord, session)
        );
        await appLib.db.createCollection(datasetsRecord.collectionName);

        return m.transformDatasetsRecord(createdDatasetsRecord, graphQlContext.userPermissions);
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
      const { parentCollectionScheme, newScheme, newSchemeFields } = await getNewSchemeByProjections(
        datasetsModelName,
        appLib,
        parentCollectionName,
        projections
      );

      try {
        const graphQlContext = await new GraphQlContext(appLib, req, datasetsModelName, args).init();
        // no filtering for create record
        graphQlContext.mongoParams = { conditions: {} };

        const datasetsId = ObjectID();
        record.collectionName = getExternalDatasetsMongooseModelName(datasetsId);
        const datasetsItem = { _id: datasetsId, ...record, scheme: newScheme };

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
          appLib.controllerUtil.postItem(graphQlContext, datasetsItem, session)
        );

        const cloneRecordsPromise = appLib.db.collection(parentCollectionName).aggregate(pipeline).next();

        // Error occurred if cloning records is in process simultaneously with creating indexes:
        // Unhandled rejection MongoError: indexes of target collection oraimports-prototype.testDataset_asd changed during processing.
        // So add graphql and mongoose scheme(with indexes) after cloning
        // TODO: do not await in future since it may take much time. add it to job queue?
        await cloneRecordsPromise;
        await addQueriesAndMutationsForDatasetsRecord(
          createdDatasetsRecord,
          appLib,
          addDefaultQueries,
          addDefaultMutations
        );
        appLib.graphQl.connect.rebuildGraphQlSchema();

        return m.transformDatasetsRecord(createdDatasetsRecord, userPermissions);
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

        removeQueriesAndMutationsForDatasetsRecord(appLib, deletedDoc, removeDefaultQueries, removeDefaultMutations);
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

        const { userContext, mongoParams, userPermissions } = graphQlContext;
        const recordInDb = (
          await appLib.dba.getItemsUsingCache({
            model: appLib.db.model(datasetsModelName),
            userContext,
            mongoParams,
          })
        )[0];
        const { name, description } = args.record;
        const newRecord = { ...recordInDb, name, description };
        const datasetRecord = appLib.dba.withTransaction((session) =>
          appLib.controllerUtil.putItem(graphQlContext, newRecord, session)
        );
        return m.transformDatasetsRecord(datasetRecord, userPermissions);
      } catch (e) {
        handleGraphQlError(e, `Unable to update record`, log, appLib);
      }
    },
  });
  m.datasetsResolvers.updateOne = type.getResolver(updateOneResolverName);

  return m;
};
