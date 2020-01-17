const { weightImperialWithOzToMetric } = require('../transformers_util');
const numberFilter = require('./number');
const { ValidationError } = require('../../../lib/errors');

function imperialWeightWithOz() {
  const { fieldPath, operation, value } = this.data;
  const metricWeight = weightImperialWithOzToMetric(value);
  if (metricWeight === undefined) {
    throw new ValidationError(`Invalid value '${value}' for filter by path '${fieldPath}'`);
  }
  return numberFilter.call({ data: { fieldPath, operation, value: metricWeight } });
}

module.exports = imperialWeightWithOz;
