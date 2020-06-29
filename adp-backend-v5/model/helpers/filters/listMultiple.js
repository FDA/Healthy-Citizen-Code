const _ = require('lodash');
const { createFilter } = require('../../../lib/filter/util');

function listMultiple() {
  // when grouping multiple list backend sends { _id: null } for a group because if $unwind even if record contains { field: [] }
  const arrValue = this.data.value === null ? [] : _.castArray(this.data.value);
  // Distinguishing empty array is necessary for DevExtreme group filter
  // For example dxQuery "[ ["list","=",[]] ]" should produce { list: [] } instead of invalid { list: { $in: [] } }
  const isArrValueEmpty = _.isEmpty(arrValue);

  return createFilter(this, {
    any: () => {},
    undefined: (fieldPath) => ({ [fieldPath]: { $exists: false } }),
    '=': (fieldPath) => ({ [fieldPath]: isArrValueEmpty ? [] : { $in: arrValue } }),
    '<>': (fieldPath) => ({ [fieldPath]: { $nin: arrValue } }),
  });
}

module.exports = listMultiple;
