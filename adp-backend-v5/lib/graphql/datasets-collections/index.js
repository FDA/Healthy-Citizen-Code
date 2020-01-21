const _ = require('lodash');
const log = require('log4js').getLogger('lib/graphql-datasets');

const { getOrCreateTypeByModel } = require('../type/model');
const {
  createOneResolverName,
  deleteOneResolverName,
  updateOneResolverName,
  deleteOutputType,
  getMongoParams,
} = require('../mutation');
const GraphQlContext = require('../../request-context/graphql/GraphQlContext');
const { COMPOSER_TYPES, MongoIdITC } = require('../type/common');
const { ValidationError, AccessError, LinkedRecordError } = require('../../errors');
const { dxQueryInput } = require('../query/dev-extreme-filter-resolver');

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
  const { _id, scheme } = record;
  const mongooseModelName = getExternalDatasetsMongooseModelName(_id);
  await addMongooseSchemaForDatasetsRecord(record, appLib, mongooseModelName);

  appLib.appModel.models[mongooseModelName] = scheme;
  appLib.datasetsModelsNames.add(mongooseModelName);

  const modelInfo = { [mongooseModelName]: scheme };
  addDefaultQueries(modelInfo);
  addDefaultMutations(modelInfo);

  appLib.graphQl.connect.connectGraphqlSchema();
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

  appLib.graphQl.connect.connectGraphqlSchema();
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

  m.addQueriesAndMutationsForDatasetsInDb = async () => {
    // create resolvers for the datasets collections "pretending" that they are normal collections
    const datasetsRecordsCursor = appLib.db
      .collection(datasetsModelName)
      .find({ scheme: { $ne: null }, ...appLib.dba.getConditionForActualRecord() });

    // TODO: resolve is it necessary to not include datasets models in appLib.appModel.models and how to find datasets schemes in graphql contexts.

    for await (const record of datasetsRecordsCursor) {
      await addQueriesAndMutationsForDatasetsRecord(record, appLib, addDefaultQueries, addDefaultMutations);
    }
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
        const datasetsItem = { ...args.record, scheme: null };

        const createdDatasetsItem = await appLib.dba.withTransaction(session =>
          appLib.controllerUtil.postItem(graphQlContext, datasetsItem, session)
        );
        await appLib.db.createCollection(datasetsItem.collectionName);

        return createdDatasetsItem;
      } catch (e) {
        log.error(e.stack);
        throw new Error(`Unable to create record`);
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
      filter: dxQueryInput,
      projections: '[String]!',
    },
    type,
    resolve: async ({ args, context }) => {
      const { req } = context;
      const { record, projections, parentCollectionName, filter } = args;

      const parentCollectionScheme = await getParentCollectionScheme(appLib, parentCollectionName, datasetsModelName);

      try {
        const graphQlContext = await new GraphQlContext(appLib, req, datasetsModelName, args).init();
        // no filtering for create record
        graphQlContext.mongoParams = { conditions: {} };

        const newScheme = _.cloneDeep(parentCollectionScheme);
        const fieldPaths = _.map(projections, projection => projection.split('.').join('.fields.'));
        const defaultFieldPaths = _.keys(_.get(appLib.appModel, 'typeDefaults.fields.Schema.fields', {}));
        const newSchemeFields = [...fieldPaths, ...defaultFieldPaths];
        newScheme.fields = _.pick(parentCollectionScheme.fields, newSchemeFields);
        const datasetsItem = { ...record, scheme: newScheme };

        const { userPermissions, inlineContext } = graphQlContext;

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

        const createdDatasetsItem = await appLib.dba.withTransaction(session =>
          appLib.controllerUtil.postItem(graphQlContext, datasetsItem, session)
        );

        // do not await since it may take much time
        // TODO: add it to job queue?
        const cloneRecordsPromise = appLib.db
          .collection(parentCollectionName)
          .aggregate([{ $match: cloneConditions }, { $project: project }, { $out: datasetsItem.collectionName }])
          .next();

        // Error occurred if cloning records is in process simultaneously with creating indexes:
        // Unhandled rejection MongoError: indexes of target collection oraimports-prototype.testDataset_asd changed during processing.
        // So add graphql and mongoose scheme(with indexes) after cloning
        await cloneRecordsPromise;
        await addQueriesAndMutationsForDatasetsRecord(
          createdDatasetsItem,
          appLib,
          addDefaultQueries,
          addDefaultMutations
        );

        return createdDatasetsItem;
      } catch (e) {
        log.error(e.stack);
        throw new Error(`Unable to clone record`);
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
        log.error(e.stack);
        if (e instanceof ValidationError || e instanceof AccessError || e instanceof LinkedRecordError) {
          throw e;
        }
        throw new Error(`Unable to delete record`);
      }
    },
  });
  m.datasetsResolvers.deleteOne = type.getResolver(deleteOneResolverName);

  type.addResolver({
    kind: 'mutation',
    name: updateOneResolverName,
    args: {
      filter: MongoIdITC.getTypeNonNull(),
      record: getOrCreateTypeByModel(datasetsModel, datasetsModelName, COMPOSER_TYPES.INPUT_WITHOUT_ID),
    },
    type,
    resolve: async ({ args, context }) => {
      try {
        const { req } = context;
        const graphQlContext = await new GraphQlContext(appLib, req, datasetsModelName, args).init();
        graphQlContext.mongoParams = getMongoParams(args);
        return appLib.dba.withTransaction(session =>
          appLib.controllerUtil.putItem(graphQlContext, args.record, session)
        );
      } catch (e) {
        log.error(e.stack);
        throw new Error(`Unable to update record`);
      }
    },
  });
  m.datasetsResolvers.updateOne = type.getResolver(updateOneResolverName);

  return m;
};
