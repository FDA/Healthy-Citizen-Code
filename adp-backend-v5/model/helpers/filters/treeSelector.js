const _ = require('lodash');
const { ObjectID } = require('mongodb');
const { createFilter } = require('../../../lib/filter/util');
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

function treeSelector(castObjectId = true) {
  const { fieldPath, value } = this.data;

  const pathForLookupId = `${fieldPath}._id`;
  const tableSpec = _.get(this.fieldSchema, 'table');
  const foreignKeyType = getForeignKeyType(tableSpec, this.appLib.appModel);
  const treeSelectorObjects = value ? _.castArray(value) : [];
  if (foreignKeyType === 'ObjectID') {
    const isAllKeysValid = treeSelectorObjects.every((obj) => ObjectID.isValid(obj._id));
    if (!isAllKeysValid) {
      throw new ValidationError(`Invalid value '${value}' for filter by path '${fieldPath}'`);
    }
  }
  const objectIds = treeSelectorObjects.map((obj) => (castObjectId ? ObjectID(obj._id) : obj._id));

  const equalCondition = _.isEmpty(value) ? { [fieldPath]: [] } : { [pathForLookupId]: { $in: objectIds } };
  return createFilter(this, {
    any: () => {},
    undefined: () => ({ [fieldPath]: { $exists: false } }),
    subtree: () => ({ [pathForLookupId]: { $in: objectIds } }),
    '=': () => equalCondition,
    allImmediateChildrenOfSelectedNodes: () => ({ [pathForLookupId]: { $in: objectIds } }),
    allExceptSelectedSubtrees: () => ({ [pathForLookupId]: { $nin: objectIds } }),
  });
}

function treeSelectorForSift() {
  if (this.data.operation !== '=') {
    throw new Error(`Only '=' operation is supported`);
  }
  const castObjectId = false;
  return treeSelector.call(this, castObjectId);
}

module.exports = {
  treeSelector,
  treeSelectorForSift,
};
