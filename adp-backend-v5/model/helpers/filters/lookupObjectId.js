const _ = require('lodash');
const { ObjectID } = require('mongodb');
const { createFilter } = require('./util');
const { ValidationError } = require('../../../lib/errors');

function lookupObjectId() {
  const { isValidObjectId } = this.appLib.butil;
  const { fieldPath, value } = this.data;

  let searchConditions;
  if (value === null) {
    searchConditions = [{ [fieldPath]: null }];
  } else {
    const arrValue = _.castArray(value);
    if (!_.every(arrValue, obj => obj._id && _.isString(obj.table))) {
      throw new ValidationError(`Value ${value} must be { _id, table } object or an array of { _id, table } objects`);
    }
    searchConditions = arrValue.map(obj => ({
      [`${fieldPath}._id`]: isValidObjectId(obj._id) ? ObjectID(obj._id) : obj._id,
      [`${fieldPath}.table`]: obj.table,
    }));
  }

  return createFilter(this, {
    any: () => {},
    undefined: _fieldPath => ({ [_fieldPath]: { $exists: false } }),
    '=': () => ({ $or: searchConditions }),
    '<>': () => ({ $nor: searchConditions }),
  });
}

module.exports = lookupObjectId;
