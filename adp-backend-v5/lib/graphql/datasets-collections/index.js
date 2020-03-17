const _ = require('lodash');
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
const { handleGraphQlError } = require('../util');

const cloneResolverName = 'clone';

// Actions postfix will be added to result of this function
function getExternalDatasetsMongooseModelName(datasetsRecordId) {
  return `_ds_${datasetsRecordId}`;
}

async function addMongooseSchemaForDatasetsRecord(datasetsRecord, appLib, mongooseModelName) {
  try {
    const { scheme, collectionName } = datasetsRecord;
    const mongooseModel = appLib.mutil.getMongooseModel(scheme, collectionName);
    appLib.db.model(mongooseModelName, mongooseModel);
  } catch (e) {
    log.error(e.stack);
    throw new Error(`Unable to build mongoose schema for ${datasetsRecord._id}`);
  }
}
async function addQueriesAndMutationsForDatasetsRecord(record, appLib, addDefaultQueries, addDefaultMutations) {
  // make a clone to protect changing stored scheme in memory by record ref
  const recordClone = _.cloneDeep(record);
  const { _id, scheme } = recordClone;
  const mongooseModelName = getExternalDatasetsMongooseModelName(_id);
  await addMongooseSchemaForDatasetsRecord(recordClone, appLib, mongooseModelName);

  appLib.appModel.models[mongooseModelName] = scheme;
  appLib.datasetsModelsNames.add(mongooseModelName);

  const modelInfo = { [mongooseModelName]: scheme };
  addDefaultQueries(modelInfo);
  addDefaultMutations(modelInfo);
}

function removeMongooseSchemaForDatasetsRecord(db, modelName) {
  delete db.models[modelName];
}
function removeQueriesAndMutationsForDatasetsRecord(appLib, record, removeDefaultQueries, removeDefaultMutations) {
  const mongooseModelName = getExternalDatasetsMongooseModelName(record._id);

  removeDefaultQueries(mongooseModelName);
  removeDefaultMutations(mongooseModelName);

  removeMongooseSchemaForDatasetsRecord(appLib.db, mongooseModelName);
  delete appLib.appModel.models[mongooseModelName];
  appLib.datasetsModelsNames.delete(mongooseModelName);

  appLib.graphQl.connect.rebuildGraphQlSchema();
}

// Seems like we don't need cloneRecordsFromId because we can determine collection by parentCollectionName
/* async function checkCloneRecordsFromId(cloneRecordsFromId, datasetsModelName) {
  const record = await appLib.db
    .collection(datasetsModelName)
    .findOne({ _id: cloneRecordsFromId, ...appLib.dba.getConditionForActualRecord() }, { _id: 1 });
  if (!record) {
    throw new Error(`Unable to find record with id ${cloneRecordsFromId} for cloning record from it`);
  }

  const cloneRecordFromCollection = await appLib.db.listCollections({ name: record.collectionName });
  if (!cloneRecordFromCollection) {
    throw new Error(`Unable to find collection ${record.collectionName} for cloning record from it`);
  }
} */

async function getParentCollectionScheme(appLib, parentCollectionName, datasetsModelName) {
  const schemeFromModels = appLib.appModel.models[parentCollectionName];
  if (schemeFromModels) {
    return schemeFromModels;
  }

  const parentDatasetRecord = await appLib.db
    .collection(datasetsModelName)
    .findOne({ collectionName: parentCollectionName, ...appLib.dba.getConditionForActualRecord() });
  if (parentDatasetRecord) {
    return parentDatasetRecord.scheme;
  }
  throw new Error(`Parent collection scheme for name ${parentCollectionName} is not found`);
}

async function getNewSchemeByProjections(datasetsModelName, appLib, parentCollectionName, projections) {
  const parentCollectionScheme = await getParentCollectionScheme(appLib, parentCollectionName, datasetsModelName);
  const newScheme = _.cloneDeep(parentCollectionScheme);
  const fieldPaths = _.map(projections, projection => projection.split('.').join('.fields.'));
  const defaultFieldPaths = _.keys(_.get(appLib.appModel, 'typeDefaults.fields.Schema.fields', {}));
  const newSchemeFields = [...fieldPaths, ...defaultFieldPaths];
  newScheme.fields = _.pick(parentCollectionScheme.fields, newSchemeFields);
  return { newScheme, newSchemeFields, parentCollectionScheme };
}

async function getCloneRecordsPipeline({
  appLib,
  parentCollectionScheme,
  userPermissions,
  inlineContext,
  filter,
  newSchemeFields,
  outCollectionName,
}) {
  // parentCollectionScheme is used for filter to allow filter for example by fields f1 and f2 and export (using projection) only field f2
  const scopeConditionsMeta = await appLib.accessUtil.getScopeConditionsMeta(
    parentCollectionScheme,
    userPermissions,
    inlineContext,
    'create'
  );
  const filterConditions = appLib.filterParser.parse(filter.dxQuery, parentCollectionScheme);
  const scopeConditions = scopeConditionsMeta.overallConditions;
  const cloneConditions = appLib.butil.MONGO.and(
    appLib.dba.getConditionForActualRecord(),
    scopeConditions,
    filterConditions
  );

  const project = _.reduce(
    newSchemeFields,
    (res, projection) => {
      res[projection] = 1;
      return res;
    },
    {}
  );
  return [{ $match: cloneConditions }, { $project: project }, { $out: outCollectionName }];
}

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
        const datasetsRecord = { ...args.record, scheme: null };

        const createdDatasetsRecord = await appLib.dba.withTransaction(session =>
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

        const createdDatasetsRecord = await appLib.dba.withTransaction(session =>
          appLib.controllerUtil.postItem(graphQlContext, datasetsItem, session)
        );

        const cloneRecordsPromise = appLib.db
          .collection(parentCollectionName)
          .aggregate(pipeline)
          .next();

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
        const deletedDoc = await appLib.dba.withTransaction(session =>
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
        const datasetRecord = appLib.dba.withTransaction(session =>
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
