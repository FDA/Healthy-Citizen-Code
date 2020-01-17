const { heightImperialToMetric } = require('../transformers_util');
const numberFilter = require('./number');
const { ValidationError } = require('../../../lib/errors');

function imperialHeight() {
  const { fieldPath, operation, value } = this.data;
  const metricHeight = heightImperialToMetric(value);
  if (metricHeight === undefined) {
    throw new ValidationError(`Invalid value '${value}' for filter by path '${fieldPath}'`);
  }
  return numberFilter.call({ data: { fieldPath, operation, value: metricHeight } });
}
module.exports = imperialHeight;
