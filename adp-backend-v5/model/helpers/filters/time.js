const numberFilter = require('./number');
const { ValidationError } = require('../../../lib/errors');
const { getTime } = require('../../../lib/util/date');

function time() {
  const { fieldPath, operation, value } = this.data;
  try {
    const timeValue = getTime(value);
    return numberFilter.call({ data: { fieldPath, operation, value: timeValue } });
  } catch (e) {
    throw new ValidationError(`Invalid value '${value}' for filter by path '${fieldPath}'`);
  }
}

module.exports = time;
