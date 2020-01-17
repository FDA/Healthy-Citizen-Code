const { createFilter } = require('./util');

function list() {
  return createFilter(this, {
    any: () => {},
    undefined: fieldPath => ({ [fieldPath]: { $exists: false } }),
    '=': '$in',
    '<>': '$nin',
  });
}

module.exports = list;
