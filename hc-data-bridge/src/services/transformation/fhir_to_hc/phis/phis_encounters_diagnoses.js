const moment = require('moment');
const _ = require('lodash');

module.exports = {
  diagnosisToProviderId (diagnosis) {
    // Need to get Condition id from diagnosis. Example: http://test.fhir.org/r3/Encounter?diagnosis:Condition=stroke&_format=json
    // Then from asserter we can get identifier, not id. Example: http://test.fhir.org/r3/Condition?asserter:missing=false&_format=json
    // Need to decide what is providerId
  },
  diagnosisToDiagnosisCode (diagnosis) {
    // Need to get Condition id from diagnosis. Example: http://test.fhir.org/r3/Encounter?diagnosis:Condition=stroke&_format=json
    // Then get Condition by id. Example: http://test.fhir.org/r3/Condition?code:missing=false&_format=json
    // Then extract code.coding[0].code
  },
  diagnosisToDiagnosisCodeType (diagnosis) {
    // Need to get Condition id from diagnosis. Example: http://test.fhir.org/r3/Encounter?diagnosis:Condition=stroke&_format=json
    // Then get Condition by id. Example: http://test.fhir.org/r3/Condition?code:missing=false&_format=json
    // Then extract code.coding[0].system
  },
};
