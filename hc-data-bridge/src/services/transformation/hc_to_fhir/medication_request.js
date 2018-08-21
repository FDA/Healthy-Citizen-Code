const _ = require('lodash');
const commonTransformations = require('../common_transformations');
const helper = require('./../../../lib/helper');

module.exports = {
  // pretransform
  splitMyMedicationsToArray (phis, inputSettings) {
    return _.map(phis.myMedications, (medication) => {
      const preparedObj = {};
      preparedObj._id = medication._id;
      preparedObj.myMedication = medication;
      preparedObj.guid = _.get(phis, 'guid') || _.get(inputSettings, 'guid');
      return preparedObj;
    });
  },
  myMedicationToDosageInstruction (myMedications) {
    const dosageInstruction = [];
    if (myMedications.frequencyTaken) {
      const frequencyTaken = _.isString(myMedications.frequencyTaken)
        ? myMedications.frequencyTaken : JSON.parse(myMedications.frequencyTaken);
      _.set(dosageInstruction, '[0].timing.repeat', frequencyTaken);
    }
    if (myMedications.dosage) {
      _.set(dosageInstruction, '[0].doseQuantity.value', myMedications.dosage);
    }
    if (myMedications.dosageUnits) {
      _.set(dosageInstruction, '[0].doseQuantity.unit', myMedications.dosageUnits);
    }
    if (myMedications.route) {
      _.set(dosageInstruction, '[0].route.coding[0].display', myMedications.route);
    }
    return dosageInstruction.length ? dosageInstruction : null;
  },
  supplyToDispenseRequest (supply) {
    if (!supply) {
      return null;
    }
    return { quantity: { value: supply } };
  },
  guidToSubject (guid) {
    return guid ? { reference: `Patient/${guid}` } : null;
  },
  myMedicationToExtension (myMedication) {
    const extension = [];
    if (myMedication.productId) {
      const productIdExtension = helper.buildStringExtension('phis.myMedications.productId', myMedication.productId);
      extension.push(productIdExtension);
    }
    if (myMedication.start) {
      const startExtension = helper.buildStringExtension('phis.myMedications.start', commonTransformations.getDate(myMedication.start));
      extension.push(startExtension);
    }
    if (myMedication.end) {
      const endExtension = helper.buildStringExtension('phis.myMedications.end', commonTransformations.getDate(myMedication.end));
      extension.push(endExtension);
    }
    if (myMedication.lot) {
      const lotExtension = helper.buildStringExtension('phis.myMedications.lot', myMedication.lot);
      extension.push(lotExtension);
    }
    if (myMedication.key) {
      const keyExtension = helper.buildStringExtension('phis.myMedications.key', myMedication.key);
      extension.push(keyExtension);
    }
    return extension.length ? extension : null;
  },
};
