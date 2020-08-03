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

function getLookupDataType(tableSpec, typeName) {
  if (_.isEmpty(tableSpec.data)) {
    return null;
  }
  // since we cannot determine type by js expression - set it to Anything
  const dataFields = {};
  _.each(tableSpec.data, (val, key) => {
    dataFields[key] = AnythingType;
  });
  return schemaComposer.createObjectTC({ name: typeName, fields: dataFields });
}

function getInputLookupType(lookupId, tablesSpec, isTreeSelector) {
  const typeName = `Input${lookupId}`;
  if (schemaComposer.has(typeName)) {
    return schemaComposer.get(typeName);
  }

  const enumName = `${lookupId}_Enum`;
  const tableNames = _.keys(tablesSpec);
  const config = {
    name: typeName,
    fields: {
      ...baseLookupFields,
      table: getOrCreateEnum(enumName, tableNames).getTypeNonNull(),
    },
  };

  // Input Union is not implemented but is supported by RFC - https://github.com/graphql/graphql-spec/issues/488
  // This is why Input type 'data' field contains all 'data' fields among all tables
  const dataFields = {};
  _.each(tablesSpec, (tableSpec) => {
    _.each(_.keys(tableSpec.data), (key) => {
      dataFields[key] = AnythingType;
    });
  });
  if (!_.isEmpty(dataFields)) {
    const dataCombinedTypeName = `${lookupId}_input_data`;
    config.fields.data = schemaComposer.createInputTC({ name: dataCombinedTypeName, fields: dataFields });
  }

  if (isTreeSelector) {
    config.fields.isLeaf = 'Boolean';
  }
  return schemaComposer.createInputTC(config);
}

function getOutputLookupType(lookupId, tablesSpec, modelName, fieldPath, isTreeSelector) {
  const fieldTypeName = `${modelName}_${fieldPath.join('_')}`;
  if (schemaComposer.has(fieldTypeName)) {
    return schemaComposer.get(fieldTypeName);
  }

  const tableLookupTypes = [];
  _.each(tablesSpec, (tableSpec, tableName) => {
    const tableTypeName = isTreeSelector
      ? getTreeselectorTypeName(lookupId, tableName)
      : getLookupTypeName(lookupId, tableName);
    if (schemaComposer.has(tableTypeName)) {
      return tableLookupTypes.push(schemaComposer.get(tableTypeName));
    }

    const config = {
      name: tableTypeName,
      fields: { ...baseLookupFields, table: 'String' },
    };
    if (isTreeSelector) {
      config.fields.isLeaf = 'Boolean';
    }

    const dataTypeName = `${lookupId}_${tableName}_data`;
    const dataType = getLookupDataType(tableSpec, dataTypeName);
    if (dataType) {
      config.fields.data = dataType;
    }

    tableLookupTypes.push(schemaComposer.createObjectTC(config));
  });

  if (tableLookupTypes.length === 1) {
    return tableLookupTypes[0].clone(fieldTypeName);
  }
  return schemaComposer.createUnionTC({
    name: fieldTypeName,
    types: tableLookupTypes,
    resolveType(value) {
      return getLookupTypeName(lookupId, value.table);
    },
  });
}

function getLookupType(lookupSpec, modelName, fieldPath, composerType) {
  const { id: lookupId, table: tablesSpec } = lookupSpec.lookup;
  const isTreeSelector = false;
  return isInputType(composerType)
    ? getInputLookupType(lookupId, tablesSpec, isTreeSelector)
    : getOutputLookupType(lookupId, tablesSpec, modelName, fieldPath, isTreeSelector);
}

function getTreeSelectorType(treeselectorSpec, modelName, fieldPath, composerType) {
  const lookupId = treeselectorSpec.table.id;
  const tablesSpec = _.omit(treeselectorSpec.table, ['id']);
  const isTreeSelector = true;
  return isInputType(composerType)
    ? getInputLookupType(lookupId, tablesSpec, isTreeSelector).getTypePlural()
    : getOutputLookupType(lookupId, tablesSpec, modelName, fieldPath, isTreeSelector).getTypePlural();
}

module.exports = {
  getLookupTypeName,
  getTreeselectorTypeName,
  getLookupType,
  getTreeSelectorType,
};
