const { stringOperations } = require('./util');
const { ValidationError } = require('../../../lib/errors');

function file() {
  const { fieldPath, operation, value } = this.data;
  const generator = stringOperations[operation];
  if (!generator) {
    throw new ValidationError(`Invalid operation '${operation}' for filter by path '${fieldPath}'`);
  }
  const fieldPathForName = `${fieldPath}.name`;
  return generator(fieldPathForName, value);
}

module.exports = file;
