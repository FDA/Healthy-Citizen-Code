const { ObjectID } = require('mongodb');
const { ValidationError } = require('../../../lib/errors');

function objectId() {
  const { fieldPath, operation, value } = this.data;
  const isValidObjectId = ObjectID.isValid(value);
  if (operation === '=') {
    return isValidObjectId ? { [fieldPath]: ObjectID(value) } : { $eq: [true, false] };
  }
  if (operation === '<>') {
    return isValidObjectId ? { [fieldPath]: { $ne: ObjectID(value) } } : {};
  }
  if (operation === 'any') {
    return {};
  }
  if (operation === 'undefined') {
    return { [fieldPath]: { $exists: false } };
  }

  throw new ValidationError(
    `Invalid operation '${operation}' for filter by path '${fieldPath}'. Supported operations: '=', '<>', 'any', 'undefined'.`
  );
}

function objectIdForSift() {
  const { fieldPath, operation, value } = this.data;
  if (operation !== '=') {
    throw new Error(`Only '=' operation is supported`);
  }
  return { [fieldPath]: value };
}

module.exports = {
  objectId,
  objectIdForSift,
};
