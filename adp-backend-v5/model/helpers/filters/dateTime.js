const numberFilter = require('./number');
const { ValidationError } = require('../../../lib/errors');

function dateTime() {
  const { fieldPath, operation, value } = this.data;
  if (value === null) {
    // for DX group query
    return numberFilter.call({ data: { fieldPath, operation, value: null } });
  }

  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    throw new ValidationError(`Invalid value '${value}' for filter by path '${fieldPath}'`);
  }
  return numberFilter.call({ data: { fieldPath, operation, value: dateValue } });
}

module.exports = dateTime;
