const _ = require('lodash')
    , log4js = require('log4js')
    , logger = log4js.getLogger()
    , PiiData = require('./../../models/pii_data')
    
    , modelInstanceGenerator = require('./../../generators/model_instance_generator').modelInstanceGenerate
    , modelsJson = require('./../../src/data_model/model-v2')
    , model = modelInstanceGenerator(modelsJson.models.pii, "empty")
    
    , patientAdapter = require('../../adapters/patient_to_pii')
    , resourceService = require('./resource_service');

const saveStrategiesHandlers = {
    "create": function (data) {
        return new Promise(function (resolve, reject) {
            let piiFromData = patientAdapter.fromFHIR(data);
            logger.trace('PII inPatient resource service CREATE: ', piiFromData);
            PiiData.find({email: piiFromData.email}).lean().exec()
                .then(function (result) {
                    if (result.length !== 0) {
                        return resolve("Already exist this resource");
                    }
                    resolve(piiFromData) // TODO remove it later
                    logger.trace('Imitation save pii');

                });
        })
    },
};

module.exports.saveFromFHIR = function (data, strategy, model) {
    return resourceService.saveFromFHIR(data, saveStrategiesHandlers, strategy, model)
};