const _ = require('lodash');
const { createFilter } = require('../../../lib/filter/util');

function number() {
  const type = _.get(this.modelSchema, `${this.path}.type`, '');
  const { fieldPath, value } = this.data;
  let eqCondition;
  if (type.endsWith('[]') && value === null) {
    eqCondition = { $or: [{ [fieldPath]: null }, { [fieldPath]: [] }] };
  } else {
    eqCondition = { [fieldPath]: value };
  }

  return createFilter(this, {
    any: {},
    undefined: { [fieldPath]: { $exists: false } },
    '=': eqCondition,
    '<>': '$ne',
    '<': '$lt',
    '<=': '$lte',
    '>': '$gt',
    '>=': '$gte',
    // between is defined only on frontend side
  });
}

module.exports = number;
