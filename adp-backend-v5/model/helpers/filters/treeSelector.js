const _ = require('lodash');
const { ObjectID } = require('mongodb');
const { createFilter } = require('./util');
const { ValidationError } = require('../../../lib/errors');

function getForeignKeyType(tableSpec, allModels) {
  const treeSelectorSpec = _.omit(tableSpec, ['id']);
  const collectionName = _.keys(treeSelectorSpec)[0];
  const foreignKeyField = treeSelectorSpec[collectionName].foreignKey;
  if (foreignKeyField === '_id') {
    return 'ObjectID';
  }
  return _.get(allModels, [collectionName, foreignKeyField, 'type']);
}

function treeSelector() {
  const { fieldPath, value } = this.data;
  let foreignKeys = _.castArray(value);

  const tableSpec = _.get(this.modelSchema, `${this.path}.table`);
  const foreignKeyType = getForeignKeyType(tableSpec);
  if (foreignKeyType === 'ObjectID') {
    const isAllKeysValid = foreignKeys.every(k => ObjectID.isValid(k));
    if (!isAllKeysValid) {
      throw new ValidationError(`Invalid value '${value}' for filter by path '${fieldPath}'`);
    }
    foreignKeys = foreignKeys.map(k => ObjectID(k));
  }
  const pathForLookupId = `${fieldPath}._id`;

  return createFilter(this, {
    any: () => {},
    undefined: () => ({ [fieldPath]: { $exists: false } }),
    subtree: () => ({ [pathForLookupId]: { $in: foreignKeys } }),
    allImmediateChildrenOfSelectedNodes: () => ({ [pathForLookupId]: { $in: foreignKeys } }),
    allExceptSelectedSubtrees: () => ({ [pathForLookupId]: { $nin: foreignKeys } }),
  });
}

module.exports = treeSelector;
