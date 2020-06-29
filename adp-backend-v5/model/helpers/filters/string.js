const { createFilter, stringOperations } = require('../../../lib/filter/util');

function string() {
  return createFilter(this, stringOperations);
}

module.exports = string;
