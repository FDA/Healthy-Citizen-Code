const _ = require('lodash')
    , log4js = require('log4js')
    , logger = log4js.getLogger()
    
    , modelInstanceGenerator = require('./../../generators/model_instance_generator').modelInstanceGenerate
    , modelsJson = require('./../../src/data_model/model-v2')
    , model = modelInstanceGenerator(modelsJson.models.pii, "empty")
    , errors = require('./../../errors/errors');

const defaultStrategy = "create";

module.exports.saveFromFHIR = function (data, saveStrategiesHandlers, strategy, model) {
    return new Promise(
        function (resolve, reject) {
            let saveStrategy = strategy;
            if (!saveStrategiesHandlers[saveStrategy]) {
                logger.error("Unexpected strategy " + strategy + "in saveFromFHIR method in patient resource service. Now use default strategy create")
                saveStrategy = defaultStrategy;
            }
            resolve(saveStrategiesHandlers[saveStrategy](data, model))
                .catch(function (error) {
                    return reject(errors.onCatchHandler(error));
                })
        })
};

/**
 *  Function for prepare items for insert in encounter child schema.
 * @param fhirResources {array} - array with resources from hospital in fhir format
 * @param resourceAdapter {object} - adapter for current resource
 */
module.exports.prepareEncounterChildItems = (fhirResources, resourceAdapter) => {
    let preparedResources = [];
    _.each(fhirResources, function (resourceWrapper) {
        if (resourceWrapper.resource.encounter) {
            let linkToEncounter = resourceWrapper.resource.encounter.reference.split('/');
            let encounterId = linkToEncounter[linkToEncounter.length - 1];
            let preparedResourceObj = {
                encounterId: encounterId,
                resource: resourceAdapter.fromFHIR(resourceWrapper.resource)
            };
            if (preparedResourceObj.resource !== false) {
                preparedResources.push(preparedResourceObj);
            }
        } else {
            logger.warn('Resource ', resourceWrapper, ' without encounter will be ignore.')
        }
    });
    return preparedResources;
};