const decimalFromString = require('bson/lib/decimal128.js').fromString;
const numberFilter = require('./number');
const { ValidationError } = require('../../../lib/errors');

function decimal128() {
  const { fieldPath, operation, value } = this.data;
  let decimal;
  try {
    decimal = decimalFromString(value);
  } catch (e) {
    throw new ValidationError(`Invalid decimal value '${value}' passed for filter by path '${fieldPath}'`);
  }
  return numberFilter.call({ data: { fieldPath, operation, value: decimal } });
}

module.exports = decimal128;
