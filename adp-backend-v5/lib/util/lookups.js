const _ = require('lodash');
const { getDocValueForExpression } = require('./util');

function getTableSpecParams(tableSpec) {
  const foreignKeyFieldName = _.get(tableSpec, 'foreignKey', '_id');
  const labelField = _.get(tableSpec, 'label', '_id');
  const { table, data } = tableSpec;
  return { foreignKeyFieldName, labelField, table, data };
}

function getLabelOrDataValue(doc, expr) {
  const val = getDocValueForExpression(doc, expr);
  if (val instanceof Date) {
    return val.toISOString();
  }
  return val;
}

function getLookup(doc, tableSpecParams) {
  const { foreignKeyFieldName, labelField, table, data } = tableSpecParams;
  const lookup = {
    _id: _.get(doc, foreignKeyFieldName),
    label: getLabelOrDataValue(doc, labelField),
    table,
  };
  _.each(data, (dataExpr, dataFieldName) => {
    _.set(lookup, `data.${dataFieldName}`, getLabelOrDataValue(doc, dataExpr));
  });
  return lookup;
}

function buildLookupFromDoc(doc, tableSpec) {
  const tableSpecParams = getTableSpecParams(tableSpec);
  return getLookup(doc, tableSpecParams);
}

function buildLookupsFromDocs(docs, tableSpec) {
  const tableSpecParams = getTableSpecParams(tableSpec);
  return _.map(docs, doc => getLookup(doc, tableSpecParams));
}

module.exports = {
  getLabelOrDataValue,
  buildLookupFromDoc,
  buildLookupsFromDocs,
};
