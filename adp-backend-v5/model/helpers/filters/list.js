const _ = require('lodash');
const { createFilter } = require('./util');

function list() {
  const arrValue = _.castArray(this.data.value);

  return createFilter(this, {
    any: () => {},
    undefined: fieldPath => ({ [fieldPath]: { $exists: false } }),
    '=': fieldPath => ({ [fieldPath]: { $in: arrValue } }),
    '<>': fieldPath => ({ [fieldPath]: { $nin: arrValue } }),
  });
}

module.exports = list;
