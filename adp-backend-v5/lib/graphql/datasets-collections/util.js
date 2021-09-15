const _ = require('lodash');
const { updateOutputAndInputTypesByModel } = require('../type/model');
const { AccessError } = require('../../errors');

const datasetsModelName = 'datasets';

function getDatasetRecordSchemaName(datasetsRecordId) {
  return `_ds_${datasetsRecordId}`;
}

async function addQueriesAndMutationsForDatasetsRecord(appLib, datasetRecord) {
  // make a clone to protect changing stored scheme in memory by datasetRecord ref
  const recordClone = _.cloneDeep(datasetRecord);
  const { scheme } = recordClone;
  const schemaName = getDatasetRecordSchemaName(datasetRecord._id);
  scheme.schemaName = schemaName;
  appLib.appModel.models[schemaName] = scheme;

  const schemeFields = _.get(datasetRecord.scheme, 'fields', {});
  const schemeFieldNames = _.keys(schemeFields);
  if (schemeFieldNames.length === 1 && schemeFieldNames[0] === '_id') {
    return;
  }

  const { addDefaultQueries, addDefaultMutations } = appLib.graphQl;
  const modelInfo = { [schemaName]: scheme };
  updateOutputAndInputTypesByModel(scheme, schemaName);
  addDefaultQueries(modelInfo);
  addDefaultMutations(modelInfo);

  // create indexes with 'await', since { background: true } option might be specified
  const collectionName = _.get(recordClone, 'scheme.collectionName', recordClone.collectionName);
  await appLib.mutil.removeUnusedIndexes({ schemaName, collectionName });
  await appLib.mutil.createIndexes({ schemaName, collectionName });
  appLib.datasetModelNames.add(schemaName);
}

function removeQueriesAndMutationsForDatasetsRecord(appLib, datasetRecord) {
  const { schemaName } = datasetRecord.scheme;

  const { removeDefaultQueries, removeDefaultMutations } = appLib.graphQl;
  removeDefaultQueries(schemaName);
  removeDefaultMutations(schemaName);

  delete appLib.appModel.models[schemaName];
  appLib.datasetModelNames.delete(schemaName);

  appLib.graphQl.connect.rebuildGraphQlSchema();
}

// Seems like we don't need cloneRecordsFromId because we can determine collection by parentCollectionName
/* async function checkCloneRecordsFromId(cloneRecordsFromId, datasetsModelName) {
  const record = await appLib.db
    .collection(datasetsModelName)
    .findOne({ _id: cloneRecordsFromId, ...appLib.dba.getConditionForActualRecord(datasetsModelName) }, { _id: 1 });
  if (!record) {
    throw new Error(`Unable to find record with id ${cloneRecordsFromId} for cloning record from it`);
  }

  const cloneRecordFromCollection = await appLib.db.listCollections({ name: record.collectionName });
  if (!cloneRecordFromCollection) {
    throw new Error(`Unable to find collection ${record.collectionName} for cloning record from it`);
  }
} */

async function getParentCollectionScheme(appLib, parentCollectionModel) {
  const schemeFromModels = appLib.appModel.models[parentCollectionModel];
  if (schemeFromModels) {
    return schemeFromModels;
  }

  const { record: parentDatasetRecord } = await appLib.db.collection(datasetsModelName).hookQuery('findOne', {
    collectionName: appLib.dba.getCollectionName(parentCollectionModel),
    ...appLib.dba.getConditionForActualRecord(datasetsModelName),
  });
  if (parentDatasetRecord) {
    return parentDatasetRecord.scheme;
  }
  throw new Error(`Parent collection scheme for name ${parentCollectionModel} is not found`);
}

async function getNewSchemeByProjections({
  datasetRecordSchemaName,
  appLib,
  parentCollectionName,
  projections,
  fixLookupIdDuplicates,
}) {
  const parentCollectionScheme = await getParentCollectionScheme(appLib, parentCollectionName, datasetsModelName);
  const newScheme = _.cloneDeep(parentCollectionScheme);
  const fieldPaths = _.map(projections, (projection) => projection.split('.').join('.fields.'));
  const defaultFieldPaths = _.keys(_.get(appLib.appModel, 'typeDefaults.fields.Schema.fields', {}));
  const newSchemeFields = [...fieldPaths, ...defaultFieldPaths];
  newScheme.fields = _.pick(parentCollectionScheme.fields, newSchemeFields);
  newScheme.schemaName = datasetRecordSchemaName;

  // skip unique indexes for non-existing fields
  newScheme.indexes = _.filter(newScheme.indexes, (indexSpec) => {
    const isUniqueIndex = _.get(indexSpec, 'options.unique') === true;
    if (!isUniqueIndex) {
      return true;
    }
    const indexedFieldPaths = _.keys(indexSpec.keys);
    // It doesn't work for types with implied fields like "_id", "table" for LookupObjectID or dynamic fields like Mixed/AssociativeArray
    // TODO: Make it work for all types
    const indexedFieldSchemePaths = indexedFieldPaths.map((ifp) => ifp.split('.').join('.fields.'));
    const hasFieldNotDeclaredInScheme = indexedFieldSchemePaths.find((p) => !_.has(newScheme.fields, p));
    return !hasFieldNotDeclaredInScheme;
  });

  fixLookupIdDuplicates(newScheme, [datasetRecordSchemaName]);
  return { newScheme, newSchemeFields, parentCollectionScheme };
}

async function getOutputRecordsPipeline({
  appLib,
  parentCollectionScheme,
  userPermissions,
  inlineContext,
  filter,
  newSchemeFields,
  outCollectionName,
}) {
  // if user can view records then he can export them
  const action = 'view';
  // parentCollectionScheme is used for filtering for example by fields f1 and f2 and export (using projection) only field f2
  const scopeConditionsMeta = await appLib.accessUtil.getScopeConditionsMeta(
    parentCollectionScheme,
    userPermissions,
    inlineContext,
    action
  );
  const { conditions: filterConditions } = appLib.filterParser.parse(filter.dxQuery, parentCollectionScheme);
  const scopeConditions = scopeConditionsMeta.overallConditions;
  const viewConditions = appLib.butil.MONGO.and(
    appLib.dba.getConditionForActualRecord(parentCollectionScheme.schemaName),
    scopeConditions,
    filterConditions
  );

  if (viewConditions === false) {
    throw new AccessError(`Not enough permissions to perform operation.`);
  }

  const pipeline = [];
  if (viewConditions !== true) {
    pipeline.push({ $match: viewConditions });
  }
  const project = {};
  _.each(newSchemeFields, (fieldProjection) => {
    project[fieldProjection] = 1;
  });
  if (!_.isEmpty(project)) {
    pipeline.push({ $project: project });
  }
  pipeline.push({ $out: outCollectionName });

  return pipeline;
}

module.exports = {
  getDatasetRecordSchemaName,
  addQueriesAndMutationsForDatasetsRecord,
  removeQueriesAndMutationsForDatasetsRecord,
  getNewSchemeByProjections,
  getOutputRecordsPipeline,
  datasetsModelName,
};
