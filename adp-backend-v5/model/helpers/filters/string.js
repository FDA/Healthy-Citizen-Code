const { createFilter, stringOperations } = require('./util');

function string() {
  return createFilter(this, stringOperations);
}

module.exports = string;
