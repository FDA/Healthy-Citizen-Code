const { createFilter } = require('./util');

function number() {
  return createFilter(this, {
    any: () => {},
    undefined: fieldPath => ({ [fieldPath]: { $exists: false } }),
    '=': '$eq',
    '<>': '$ne',
    '<': '$lt',
    '<=': '$lte',
    '>': '$gt',
    '>=': '$gte',
    // between is defined only on frontend side
  });
}

module.exports = number;
