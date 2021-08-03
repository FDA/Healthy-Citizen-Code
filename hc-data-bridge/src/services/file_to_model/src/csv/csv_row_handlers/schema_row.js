const _ = require('lodash');

const { META_INFO_COLUMN_NAME } = require('../../consts');
const { handleStateForCsvRow, getColumnValue } = require('../util');
const { getFullNameByName } = require('../../../../gen_app_model_by_fhir/helper');

async function handleSchemaRow(csvRowData, metaInfo, state, options) {
  // remove meta column since its used only for not schema sheets
  delete csvRowData[META_INFO_COLUMN_NAME];

  const { schema: schemaState, headersMeta } = state;
  const part = getModelPart(csvRowData, schemaState, headersMeta, options);
  const existingPart = _.get(schemaState.model, schemaState.currentPath);
  if (existingPart) {
    const newPart = _.merge({}, existingPart, part);
    if (!_.isEqual(newPart, existingPart)) {
      const before = JSON.stringify(existingPart);
      const after = JSON.stringify(newPart);
      console.warn(
        `Double definition found by path '${schemaState.currentPath}'.\n Before: ${before}.\n After: ${after}.` +
        `\n Check your schema file if result is incorrect.`
      );
    }
  } else {
    _.set(schemaState.model, schemaState.currentPath, part);
  }
}

function getModelPart(csvRowData, schemaState, headersMeta, options) {
  handleStateForCsvRow(csvRowData, schemaState);

  const defaultType = _.get(options.backendMetaschema, 'type.default');
  return buildModelPart(csvRowData, defaultType, headersMeta);
}

function buildModelPart(csvRowData, defaultType, headersMeta) {
  const part = {};

  // basic fields
  const type = csvRowData.Type || defaultType;
  if (type) {
    part.type = type;
  }

  // write fullName only for fields with type
  if (part.type) {
    const fullPathName = csvRowData.Name || '';
    const nameAfterLastDot = fullPathName.substring(fullPathName.lastIndexOf('.') + 1);
    part.fullName = getFullNameByName(nameAfterLastDot);
  }

  // process optional columns
  const optionalColumns = Object.keys(csvRowData);
  _.pullAll(optionalColumns, ['Type', 'Name']);

  _.forEach(optionalColumns, optionalColumn => {
    // skip ignored fields
    const headerMeta = headersMeta[optionalColumn];
    if (headerMeta.isComment) {
      return;
    }
    const data = csvRowData[optionalColumn];
    const value = getColumnValue(data, headerMeta);
    if (!_.isUndefined(value)) {
      // skip empty strings
      _.set(part, headerMeta.path, getColumnValue(data, headerMeta));
    }
  });

  return part;
}

module.exports = handleSchemaRow;
