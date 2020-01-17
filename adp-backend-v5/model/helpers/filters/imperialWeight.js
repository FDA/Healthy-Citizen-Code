const { weightImperialToMetric } = require('../transformers_util');
const numberFilter = require('./number');
const { ValidationError } = require('../../../lib/errors');

function imperialWeight() {
  const { fieldPath, operation, value } = this.data;
  const metricWeight = weightImperialToMetric(value);
  if (metricWeight === undefined) {
    throw new ValidationError(`Invalid value '${value}' for filter by path '${fieldPath}'`);
  }
  return numberFilter.call({ data: { fieldPath, operation, value: metricWeight } });
}

module.exports = imperialWeight;
