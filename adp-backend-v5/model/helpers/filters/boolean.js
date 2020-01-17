const { createFilter } = require('./util');

function boolean() {
  return createFilter(this, {
    any: () => {},
    undefined: fieldPath => ({ [fieldPath]: { $exists: false } }),
    yes: fieldPath => ({ [fieldPath]: true }),
    no: fieldPath => ({ [fieldPath]: false }),
    notYes: fieldPath => ({ [fieldPath]: { $ne: true } }),
    notNo: fieldPath => ({ [fieldPath]: { $ne: false } }),
    '=': '$eq',
  });
}

module.exports = boolean;
