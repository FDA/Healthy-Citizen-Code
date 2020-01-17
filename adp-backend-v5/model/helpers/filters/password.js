const { createFilter } = require('./util');

function password() {
  return createFilter(this, {
    any: () => {},
    undefined: fieldPath => ({ [fieldPath]: { $exists: false } }),
    defined: fieldPath => ({ [fieldPath]: { $exists: true } }),
  });
}

module.exports = password;
