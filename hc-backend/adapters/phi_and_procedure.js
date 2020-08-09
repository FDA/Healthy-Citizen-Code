const  _ = require('lodash')
    , modelInstanceGenerator = require('./../generators/model_instance_generator').modelInstanceGenerate
    , modelsJson = require('./../src/data_model/model-v2')
    , model = modelInstanceGenerator(modelsJson.models.phi.encounters, "empty")
    , lists = require('./../src/data_model/lists')
    , logger = require('log4js').getLogger();


module.exports.toFHIR = function (encounter) {
    throw "not implemented now"
    return {
    }
};
/**
 * Function for parse procedure in FHIR to HC format.
 * @param procedure {object} in FHIR format
 * @param procedureModel {object} - need it later
 * @returns {object} or {false} if procedure in FHIR format is correct then return new procedure object, else return false
 */
module.exports.fromFHIR = function (procedure, procedureModel) {
    try {
        let newProcedure = {
            "procedureId": procedure.id,
            "providerId": "",
            "procedureCode": procedure.code.coding[0].code,
            // "procedureCodeType": procedure.category.coding[0].code,
        };
        if (procedure.performedPeriod) {
            newProcedure["admissionDate"] = procedure.performedPeriod.start;
            newProcedure["dischargeDate"] = procedure.performedPeriod.end;
        }
        if (procedure.identifier && procedure.identifier[0]) {
            newProcedure.originalProcedureCode = procedure.identifier[0].value
        }
        return newProcedure;
    }
    catch (error) {
        logger.warn("error " + error + "in procedure adapter in method fromFHIR, with procedure: ", procedure, " This procedure will be ignore.");
        return false
    }
};