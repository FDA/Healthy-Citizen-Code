const _ = require('lodash');
const { Decimal128 } = require('bson');
const numberFilter = require('./number');
const { ValidationError } = require('../../../lib/errors');

function parseDecimal(value, fieldPath) {
  let decimal;
  try {
    decimal = Decimal128.fromString(value);
  } catch (e) {
    throw new ValidationError(`Invalid decimal value '${value}' passed for filter by path '${fieldPath}'`);
  }
  return decimal;
}

function decimal128() {
  const { fieldPath } = this.data;
  const type = _.get(this.fieldSchema, 'type');
  if (this.data.value !== null) {
    const decimals = _.castArray(this.data.value).map((v) => parseDecimal(v, fieldPath));
    const isMultipleType = type.endsWith('[]');
    this.data.value = isMultipleType ? decimals : decimals[0];
  }

  return numberFilter.call(this);
}

function decimal128ForSift() {
  const { fieldPath, operation } = this.data;
  if (operation !== '=') {
    throw new Error(`Only '=' operation is supported`);
  }

  const type = _.get(this.fieldSchema, 'type');
  const isMultipleType = type.endsWith('[]');
  if (this.data.value === null) {
    if (isMultipleType) {
      return { $or: [{ [fieldPath]: [] }, { [fieldPath]: null }] };
    }
    return { [fieldPath]: null };
  }
  const decimals = _.castArray(this.data.value).map((v) => v.toString());
  this.data.value = isMultipleType ? decimals : decimals[0];
  return { [fieldPath]: this.data.value };
}

module.exports = {
  decimal128,
  decimal128ForSift,
};
