/**
 * See backend/model/helpers/validators.js for details
 */

module.exports = function (vutil) {
    var _ = require('lodash');

    var m = {
        "dischargeDispositionAndStatusExpired": function (modelName, lodashPath, appModelPart, userContext, handlerSpec, cb) {
            var valDisposition = vutil.getValue(this, appModelPart, lodashPath);
            var valStatus = vutil.getValue(this, appModelPart, vutil.levelUp(lodashPath) + 'dischargeDisposition');
            if (valDisposition && valStatus && ( valDisposition == 'E' && valStatus != 'E')) {
                cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, valDisposition, this, lodashPath, appModelPart));
            } else {
                cb();
            }
            //console.log(`>>> dischargeDispositionAndStatusExpired valDisposition: ${valDisposition}, limit: ${limit}, test: ${val >= limit}, lodashPath: ${lodashPath}, handlerSpec: ${JSON.stringify(handlerSpec)}`);
        },
        "notBeforeEncounterAdmissionDate": function (modelName, lodashPath, appModelPart, userContext, handlerSpec, cb) {
            var val = vutil.getValue(this, appModelPart, lodashPath);
            var encounterPath = lodashPath.split('.').slice(0, 2).join('.') + '.';
            var valEncounterAdmissionDate = vutil.getValue(this, appModelPart, encounterPath + 'admissionDate');
            //console.log(`>>> notBeforeEncounterAdmissionDate val: ${val}, tval: ${typeof val}, test: ${val < valEncounterAdmissionDate}, valEncounterAdmissionDate: ${valEncounterAdmissionDate}, lodashPath: ${lodashPath}, encounterPath: ${encounterPath}`);
            if (val && valEncounterAdmissionDate && ( val < valEncounterAdmissionDate)) {
                cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart).replace('$date', vutil.getDatePartString(valEncounterAdmissionDate)));
            } else {
                cb();
            }
        },
        "notAfterEncounterDischargeDate": function (modelName, lodashPath, appModelPart, userContext, handlerSpec, cb) {
            var val = vutil.getValue(this, appModelPart, lodashPath);
            var encounterPath = lodashPath.split('.').slice(0, 2).join('.') + '.';
            var valEncounterDischargeDate = vutil.getValue(this, appModelPart, encounterPath + 'dischargeDate');
            //console.log(`>>> notAfterEncounterDischargeDate val: ${val}, tval: ${typeof val}, test: ${val < valEncounterDischargeDate}, valEncounterDischargeDate: ${valEncounterDischargeDate}, lodashPath: ${lodashPath}, encounterPath: ${encounterPath}`);
            if (val && valEncounterDischargeDate && ( val > valEncounterDischargeDate)) {
                cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart).replace('$date', vutil.getDatePartString(valEncounterDischargeDate)));
            } else {
                cb();
            }
        },
        "homeLabsTestResultUnit": function (modelName, lodashPath, appModelPart, userContext, handlerSpec, cb) {
            var unitsMapping = {
                "1": "16",
                "2": "21",
                "3": "39",
                "4": "1",
                "5": "40",
                "6": "41"
            };
            var valResultUnit = vutil.getValue(this, appModelPart, lodashPath);
            var valTestType = vutil.getValue(this, appModelPart, vutil.levelUp(lodashPath) + 'testType');
            if (unitsMapping[valTestType] && ( unitsMapping[valTestType] !== valResultUnit)) {
                cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, valResultUnit, this, lodashPath, null, valTestType));
            } else {
                cb();
            }
        }
    }
    return m;
};
