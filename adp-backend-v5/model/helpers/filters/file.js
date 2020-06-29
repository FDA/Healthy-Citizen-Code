const _ = require('lodash');
const { stringOperations } = require('../../../lib/filter/util');
const { ValidationError } = require('../../../lib/errors');

function file() {
  const { fieldPath, operation, value } = this.data;
  // ["photos","=",[{"name":"1591034740073.png","size":18694,"type":"image/png","id":"...","cropped": true}]]
  const isDevExtremeGroupFilter = (operation === '=' && _.isArray(value)) || _.isPlainObject(value);
  if (isDevExtremeGroupFilter) {
    const arrVal = _.castArray(value);
    if (arrVal.length === 0) {
      return { [fieldPath]: value };
    }
    if (arrVal.length === 1 && value[0].id) {
      return { [`${fieldPath}.id`]: value[0].id };
    }
  }

  const generator = stringOperations[operation];
  if (!generator) {
    throw new ValidationError(`Invalid operation '${operation}' for filter by path '${fieldPath}'`);
  }
  const fieldPathForName = `${fieldPath}.name`;
  return generator(fieldPathForName, value);
}

module.exports = file;
