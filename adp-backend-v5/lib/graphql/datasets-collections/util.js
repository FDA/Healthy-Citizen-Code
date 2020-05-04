const _ = require('lodash');
const { updateOutputAndInputTypesByModel } = require('../type/model');

function getExternalDatasetsMongooseModelName(datasetsRecordId) {
  return `_ds_${datasetsRecordId}`;
}

async function addQueriesAndMutationsForDatasetsRecord(record, appLib, addDefaultQueries, addDefaultMutations) {
  // make a clone to protect changing stored scheme in memory by record ref
  const recordClone = _.cloneDeep(record);
  const { _id, scheme } = recordClone;
  const mongooseModelName = getExternalDatasetsMongooseModelName(_id);
  await addMongooseSchemaForDatasetsRecord(recordClone, appLib, mongooseModelName);

  appLib.appModel.models[mongooseModelName] = scheme;
  appLib.datasetsModelsNames.add(mongooseModelName);

  updateOutputAndInputTypesByModel(scheme, mongooseModelName);

  const modelInfo = { [mongooseModelName]: scheme };
  addDefaultQueries(modelInfo);
  addDefaultMutations(modelInfo);
}

async function addMongooseSchemaForDatasetsRecord(datasetsRecord, appLib, mongooseModelName) {
  try {
    const { scheme, collectionName } = datasetsRecord;
    const mongooseModel = appLib.mutil.getMongooseModel(scheme, collectionName);
    if (appLib.db.models[mongooseModelName]) {
      delete appLib.db.models[mongooseModelName];
    }
    appLib.db.model(mongooseModelName, mongooseModel);
  } catch (e) {
    throw new Error(`Unable to build mongoose schema for ${datasetsRecord._id}. ${e.message}`);
  }
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
  const fieldPaths = _.map(projections, (projection) => projection.split('.').join('.fields.'));
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

module.exports = {
  getExternalDatasetsMongooseModelName,
  addQueriesAndMutationsForDatasetsRecord,
  getNewSchemeByProjections,
  getCloneRecordsPipeline,
  removeQueriesAndMutationsForDatasetsRecord,
};
