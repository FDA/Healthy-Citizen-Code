const _ = require('lodash');

module.exports = {
  // example:
  // "repeat": {
  //   "boundsPeriod": {
  //     "start": "2016-09-12",
  //     "end": "2020-09-12"
  //   },
  //   "when": [
  //     "PCM"
  //   ]
  // }
  dosageInstructionToFrequencyTaken (dosageInstruction) {
    const repeat = _.get(dosageInstruction, '[0].timing.repeat');
    if (_.isString(repeat)) {
      return repeat;
    }
    if (_.isObject(repeat)) {
      return JSON.stringify(repeat);
    }
    return null;
  },
  dosageInstructionToDosage (dosageInstruction) {
    return _.get(dosageInstruction, '[0].doseQuantity.value', null);
  },
  dosageInstructionToDosageUnits (dosageInstruction) {
    return _.get(dosageInstruction, '[0].doseQuantity.unit', null);
  },
  // example:
  // "route": {
  //   "coding": [
  //     {
  //       "system": "http://chmed16af.emediplan.ch/fhir/CodeSystem/chmed16af-codesystem-cdtyp26",
  //       "code": "PO",
  //       "display": "per oral"
  //     }
  //   ]
  // }
  dosageInstructionToRoute (dosageInstruction) {
    return _.get(dosageInstruction, '[0].route.coding[0].display', null);
  },
  dispenseRequestQuantityToSupply (dispenseRequestQuantity) {
    const value = _.get(dispenseRequestQuantity, 'value', null);
    // const unit = _.get(dispenseRequestQuantity, "unit");
    // if (value && unit) {
    //   return `${value} ${unit}`;
    // }
    return value || null;
  },
  // FHIR gets lot from another resource - Medication
  // medicationRequestToLot(medicationRequest) {
  //   // tied medications should be in contained field
  //   const contained = _.get(medicationRequest, "contained", []);
  //   const medication = _.find(contained, res => res.resourceType === 'Medication');
  //   return _.get(medication, "package.batch[0].lotNumber", null);
  // },
  extensionToLot (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myMedications.lot';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
  extensionToProductId (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myMedications.productId';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
  extensionToStart (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myMedications.start';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
  extensionToEnd (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myMedications.end';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
  extensionToKey (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myMedications.key';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
};
