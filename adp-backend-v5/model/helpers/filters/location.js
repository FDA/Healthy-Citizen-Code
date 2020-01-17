const { stringOperations } = require('./util');
const { ValidationError } = require('../../../lib/errors');

function location() {
  const { fieldPath, operation, value } = this.data;
  const generator = stringOperations[operation];
  if (!generator) {
    throw new ValidationError(`Invalid operation '${operation}' for filter by path '${fieldPath}'`);
  }
  const fieldPathForLabel = `${fieldPath}.label`;
  return generator(fieldPathForLabel, value);
}

module.exports = location;
