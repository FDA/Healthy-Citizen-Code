const _ = require('lodash');
const { updateOutputAndInputTypesByModel } = require('../type/model');
const { AccessError } = require('../../errors');

function getExternalDatasetsModelName(datasetsRecordId) {
  return `_ds_${datasetsRecordId}`;
}

async function addQueriesAndMutationsForDatasetsRecord(record, appLib, addDefaultQueries, addDefaultMutations) {
  // make a clone to protect changing stored scheme in memory by record ref
  const recordClone = _.cloneDeep(record);
  const { scheme, collectionName } = recordClone;

  appLib.appModel.models[collectionName] = scheme;
  // create indexes with 'await', since { background: true } option might be specified
  await appLib.mutil.createIndexes(collectionName);
  appLib.datasetModelNames.add(collectionName);

  updateOutputAndInputTypesByModel(scheme, collectionName);

  const modelInfo = { [collectionName]: scheme };
  addDefaultQueries(modelInfo);
  addDefaultMutations(modelInfo);
}

function removeQueriesAndMutationsForDatasetsRecord(appLib, recordId, removeDefaultQueries, removeDefaultMutations) {
  const collectionName = getExternalDatasetsModelName(recordId);

  removeDefaultQueries(collectionName);
  removeDefaultMutations(collectionName);

  delete appLib.appModel.models[collectionName];
  appLib.datasetModelNames.delete(collectionName);

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

async function getParentCollectionScheme(appLib, parentCollectionName, datasetsModelName) {
  const schemeFromModels = appLib.appModel.models[parentCollectionName];
  if (schemeFromModels) {
    return schemeFromModels;
  }

  const { record: parentDatasetRecord } = await appLib.db.collection(datasetsModelName).hookQuery('findOne', {
    collectionName: parentCollectionName,
    ...appLib.dba.getConditionForActualRecord(datasetsModelName),
  });
  if (parentDatasetRecord) {
    return parentDatasetRecord.scheme;
  }
  throw new Error(`Parent collection scheme for name ${parentCollectionName} is not found`);
}

async function getNewSchemeByProjections({
  datasetsModelName,
  externalDatasetModelName,
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
  newScheme.schemaName = externalDatasetModelName;

  fixLookupIdDuplicates(newScheme, [externalDatasetModelName]);
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
  const { conditions: filterConditions } = appLib.filterParser.parse(filter.dxQuery, parentCollectionScheme);
  const scopeConditions = scopeConditionsMeta.overallConditions;
  const cloneConditions = appLib.butil.MONGO.and(
    appLib.dba.getConditionForActualRecord(parentCollectionScheme.schemaName),
    scopeConditions,
    filterConditions
  );

  if (cloneConditions === false) {
    throw new AccessError(`Not enough permissions to perform operation.`);
  }

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
  getExternalDatasetsModelName,
  addQueriesAndMutationsForDatasetsRecord,
  getNewSchemeByProjections,
  getCloneRecordsPipeline,
  removeQueriesAndMutationsForDatasetsRecord,
};
