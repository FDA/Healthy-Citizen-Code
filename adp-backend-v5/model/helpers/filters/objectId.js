const { ObjectID } = require('mongodb');
const { createFilter } = require('../../../lib/filter/util');
const { ValidationError } = require('../../../lib/errors');

function objectId() {
  const { fieldPath, operation, value } = this.data;
  if (!ObjectID.isValid(value)) {
    throw new ValidationError(`Value ${value} must be a valid ObjectId string for filter by path '${fieldPath}'.`);
  }
  const objectIdValue = ObjectID(value);
  return createFilter(
    { data: { fieldPath, operation, value: objectIdValue } },
    {
      any: () => {},
      undefined: (_fieldPath) => ({ [_fieldPath]: { $exists: false } }),
      '=': '$eq',
      '<>': '$ne',
    }
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
