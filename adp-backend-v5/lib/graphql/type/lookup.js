const { schemaComposer } = require('graphql-compose');
const _ = require('lodash');
const { MongoIdScalarTC, AnythingType, isInputType, getOrCreateEnum } = require('./common');

const LOOKUP_TYPE_PREFIX = 'Lookup';
const TREESELECTOR_TYPE_PREFIX = 'Treeselector';

function getTreeselectorTypeName(lookupId, tableName) {
  return `${TREESELECTOR_TYPE_PREFIX}_${lookupId}_${tableName}`;
}

function getLookupTypeName(lookupId, tableName) {
  return `${LOOKUP_TYPE_PREFIX}_${lookupId}_${tableName}`;
}

const baseLookupFields = {
  _id: MongoIdScalarTC.getTypeNonNull(),
  label: 'String', // it's not required since backend will set correct label automatically
};

function getInputLookupType(lookupId, tablesSpec) {
  const enumName = `${lookupId}_Enum`;
  const tableNames = Object.keys(tablesSpec);
  const typeName = `Input${lookupId}`;
  return schemaComposer.has(typeName)
    ? schemaComposer.get(typeName)
    : schemaComposer.createInputTC({
        name: typeName,
        fields: { ...baseLookupFields, table: getOrCreateEnum(enumName, tableNames).getTypeNonNull() },
      });
}

function getOutputLookupType(lookupId, tablesSpec, modelName, fieldPath, isTreeSelector) {
  const modelWithPath = `${modelName}_${fieldPath.join('_')}`;
  if (schemaComposer.has(modelWithPath)) {
    return schemaComposer.get(modelWithPath);
  }

  const tableLookupTypes = [];
  _.each(tablesSpec, (tableSpec, tableName) => {
    const typeName = isTreeSelector
      ? getTreeselectorTypeName(lookupId, tableName)
      : getLookupTypeName(lookupId, tableName);
    if (schemaComposer.has(typeName)) {
      return tableLookupTypes.push(schemaComposer.get(typeName));
    }

    const config = {
      name: typeName,
      fields: { ...baseLookupFields, table: 'String' },
    };
    if (isTreeSelector) {
      config.fields.isLeaf = 'Boolean';
    }
    if (!_.isEmpty(tableSpec.data)) {
      // since we cannot determine type by js expression - set it to Anything
      const dataFields = {};
      _.each(tableSpec.data, (val, key) => {
        dataFields[key] = AnythingType;
      });
      const lookupWithTable = `${lookupId}_${tableName}`;
      config.fields.data = schemaComposer.createObjectTC({ name: `${lookupWithTable}_data`, fields: dataFields });
    }
    tableLookupTypes.push(schemaComposer.createObjectTC(config));
  });

  if (tableLookupTypes.length === 1) {
    return tableLookupTypes[0].clone(modelWithPath);
  }
  return schemaComposer.createUnionTC({
    name: modelWithPath,
    types: tableLookupTypes,
    resolveType(value) {
      return getLookupTypeName(lookupId, value.table);
    },
  });
}

function getLookupType(lookupSpec, modelName, fieldPath, composerType) {
  const { id: lookupId, table: tablesSpec } = lookupSpec.lookup;
  return isInputType(composerType)
    ? getInputLookupType(lookupId, tablesSpec)
    : getOutputLookupType(lookupId, tablesSpec, modelName, fieldPath, false);
}

function getTreeSelectorType(treeselectorSpec, modelName, fieldPath, composerType) {
  const lookupId = treeselectorSpec.table.id;
  const tablesSpec = _.omit(treeselectorSpec.table, ['id']);
  return isInputType(composerType)
    ? getInputLookupType(lookupId, tablesSpec).getTypePlural()
    : getOutputLookupType(lookupId, tablesSpec, modelName, fieldPath, true).getTypePlural();
}

module.exports = {
  getLookupTypeName,
  getTreeselectorTypeName,
  getLookupType,
  getTreeSelectorType,
};
