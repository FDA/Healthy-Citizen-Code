const _ = require('lodash');
const { stringOperations } = require('../../../lib/filter/util');
const { ValidationError } = require('../../../lib/errors');

function location() {
  const { fieldPath, operation, value } = this.data;
  const isDevExtremeGroupFilter = operation === '=' && _.isPlainObject(value);
  if (isDevExtremeGroupFilter) {
    const val = _.isNil(value.label) ? null : value.label;
    return { [`${fieldPath}.label`]: val };
  }

  const generator = stringOperations[operation];
  if (!generator) {
    throw new ValidationError(`Invalid operation '${operation}' for filter by path '${fieldPath}'`);
  }
  const fieldPathForLabel = `${fieldPath}.label`;
  return generator(fieldPathForLabel, value);
}

module.exports = location;
