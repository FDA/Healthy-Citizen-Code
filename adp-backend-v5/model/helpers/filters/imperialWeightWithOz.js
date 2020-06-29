const { weightImperialWithOzToMetric } = require('../transformers_util');
const numberFilter = require('./number');
const { ValidationError } = require('../../../lib/errors');

function imperialWeightWithOz() {
  const { fieldPath, operation, value } = this.data;
  if (value === null) {
    // for DX group query
    return numberFilter.call({ data: { fieldPath, operation, value: null } });
  }

  const metricWeight = weightImperialWithOzToMetric(value);
  if (metricWeight === undefined) {
    throw new ValidationError(`Invalid value '${value}' for filter by path '${fieldPath}'`);
  }
  return numberFilter.call({ data: { fieldPath, operation, value: metricWeight } });
}

// 'Imperial Height' field is stored as Metric system value in db and presented as Imperial system value for client, therefore it's necessary to build filter for Imperial system to filter data for client with sift
function imperialWeightWithOzForSift() {
  const { fieldPath, operation, value } = this.data;
  if (operation !== '=') {
    throw new Error(`Only '=' operation is supported`);
  }

  return { [fieldPath]: value };
}

module.exports = { imperialWeightWithOz, imperialWeightWithOzForSift };
