const { createFilter, stringOperations } = require('../../../lib/filter/util');

function html() {
  this.data.fieldPath += '.htmlNoTags';
  return createFilter(this, stringOperations);
}

module.exports = html;
