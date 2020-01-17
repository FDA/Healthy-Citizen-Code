const _ = require('lodash');
const { ObjectID } = require('mongodb');
const { createFilter } = require('./util');
const { ValidationError } = require('../../../lib/errors');

function lookupObjectId() {
  const { isValidObjectId } = this.appLib.butil;
  const { fieldPath, value } = this.data;
  if (!_.isArray(value) || !_.every(value, obj => obj._id && _.isString(obj.table))) {
    throw new ValidationError(`Value ${value} must be an array of objects with form { _id, table }`);
  }

  const searchConditions = value.map(obj => ({
    [`${fieldPath}._id`]: isValidObjectId(obj._id) ? ObjectID(obj._id) : obj._id,
    [`${fieldPath}.table`]: obj.table,
  }));

  return createFilter(this, {
    any: () => {},
    undefined: _fieldPath => ({ [_fieldPath]: { $exists: false } }),
    '=': () => ({ $or: searchConditions }),
    '<>': () => ({ $nor: searchConditions }),
  });
}

module.exports = lookupObjectId;
