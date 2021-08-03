const _ = require('lodash');

const { META_INFO_COLUMN_NAME } = require('../../consts');
const { handleStateForCsvRow, getColumnValue } = require('../util');

async function handleEtlRow(csvRowData, metaInfo, state, options) {
  // remove meta column since its used only for not schema sheets
  delete csvRowData[META_INFO_COLUMN_NAME];

  const part = getModelPart(csvRowData, state.etl, state.headersMeta);
  if (state.etl.currentPath) {
    validatePart(part);
    _.set(state.etl.model, state.etl.currentPath, part);
  }
}

function getModelPart (csvRowData, etlState, headersMeta) {
  handleStateForCsvRow(csvRowData, etlState);

  return buildEtlPart(csvRowData, headersMeta);
}

function buildEtlPart(csvRowData, headersMeta) {
  const part = {};

  const simpleColumns = _.pullAll(Object.keys(csvRowData), ['Value']);
  _.forEach(simpleColumns, simpleColumn => {
    const headerMeta = headersMeta[simpleColumn];
    if (headerMeta.isComment) {
      return;
    }
    const data = csvRowData[simpleColumn];
    const value = getColumnValue(data, headerMeta);
    // skip empty strings
    if (!_.isUndefined(value)) {
      _.set(part, headerMeta.path, value);
    }
  });

  // set Value column without modifications (js code)
  _.set(part, 'value', csvRowData.Value);

  return part;
}

const validTypes = ['Number', 'String', 'Boolean', 'Date', 'Object', 'LookupObjectID', 'LookupObjectID[]', 'Collection', 'Delete'];

function validatePart (part) {
  const isValidType = validTypes.includes(part.type);
  if (!isValidType) {
    throw new Error(`Type '${part.type}' is invalid for !etl tab.`);
  }
}

module.exports = handleEtlRow;
