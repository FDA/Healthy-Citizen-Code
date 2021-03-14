const { createFilter } = require('../../../lib/filter/util');

function triStateBoolean() {
  return createFilter(this, {
    any: () => {},
    undefined: (fieldPath) => ({ [fieldPath]: { $exists: false } }),
    yes: (fieldPath) => ({ [fieldPath]: true }),
    no: (fieldPath) => ({ [fieldPath]: false }),
    unknown: (fieldPath) => ({ [fieldPath]: null }),
    notYes: (fieldPath) => ({ [fieldPath]: { $ne: true } }),
    notNo: (fieldPath) => ({ [fieldPath]: { $ne: false } }),
    '=': '$eq',
  });
}

module.exports = triStateBoolean;
