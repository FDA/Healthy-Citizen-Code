const _ = require('lodash');
const { createFilter } = require('../../../lib/filter/util');

function list() {
  const arrValue = _.castArray(this.data.value);
  // Distinguishing empty array is neccessary for DevExtreme group filter
  // For example dxQuery "[ ["list","=",[]] ]" should produce { list: [] } instead of invalid { list: { $in: [] } }
  const isArrValueEmpty = _.isEmpty(arrValue);

  return createFilter(this, {
    any: () => {},
    undefined: (fieldPath) => ({ [fieldPath]: { $exists: false } }),
    '=': (fieldPath) => ({ [fieldPath]: isArrValueEmpty ? [] : { $in: arrValue } }),
    '<>': (fieldPath) => ({ [fieldPath]: { $nin: arrValue } }),
  });
}

module.exports = list;
