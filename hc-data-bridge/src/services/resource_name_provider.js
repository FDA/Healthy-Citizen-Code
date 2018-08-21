const _ = require('lodash');

// currently only for Patient resource
const queryParamToFhirResource = {
  _revinclude: {
    'AdverseEvent:subject': 'adverse_event',
    'Recall:patient': 'recall',
    'MedicationRequest:subject': 'medication_request',
    'Device:patient': 'device',
  },
};

const getFhirResourceNamesByQueryParam = (paramName, paramValues) => {
  const valuesToResources = queryParamToFhirResource[paramName];
  if (!valuesToResources || !paramValues) {
    return [];
  }
  const fhirResourceNames = [];
  _.forEach(paramValues, (paramValue) => {
    const resourceName = valuesToResources[paramValue];
    if (resourceName) {
      fhirResourceNames.push(resourceName);
    }
  });
  return fhirResourceNames;
};

module.exports = { getFhirResourceNamesByQueryParam };
