const _ = require('lodash')
    , log4js = require('log4js')
    , logger = log4js.getLogger()
    
    , encounterAdapter = require('../../adapters/phi_and_encounter')
    , resourceService = require('./resource_service')
    , errors = require('./../../errors/errors');

const mongoose = require('mongoose');

const saveStrategiesHandlers = {
    "createOrUpdate": function (data, model) {
        return new Promise(function (resolve, reject) {
            logger.trace('Start create or update encounter');
            saveStrategiesHandlers["create"](data, model)
                .then(function (result) {
                    return saveStrategiesHandlers["updateAfterCreate"](model, result);
                })
                .then(function () {
                    resolve();
                })
                .catch((error) => {
                    return reject(errors.onCatchHandler(error));
                })
        })
    },
    "create": function (data, model) {
        logger.trace('Start create encounters');
        return new Promise(function (resolve, reject) {
            if (!data.entry || data.total === 0) {
                return resolve();
            }
            let fhirResources = data.entry;
            let encountersForUpdate = [];
            _.each(fhirResources, function (resource) {
                let encounterData;
                let encounterInHcFormat;
                let foundEncounterIndex;
                if (resource.resource.resourceType === "Encounter") {
                    encounterData = resource.resource;
                    encounterInHcFormat = encounterAdapter.fromFHIR(encounterData);
                    _.each(model.encounters, function (encounterInModel, encounterInModelIndex) {
                        if (encounterInModel.encounterId === encounterInHcFormat.encounterId) {
                            foundEncounterIndex = encounterInModelIndex;
                            encountersForUpdate.push({
                                encounter: encounterInHcFormat,
                                encounterIndex: foundEncounterIndex
                            });
                        }
                    });
                    encounterAdapter.addLocationInfoToEncounter(encounterInHcFormat, fhirResources);
                    if (!foundEncounterIndex) {
                        model.encounters.push(encounterInHcFormat);
                    }
                }
            });
            resolve(encountersForUpdate);
        })
    },
    /**
     * Function for update encounters in model.
     * @param model - {object} - document for update
     * @param arrayWithInfoAboutUpdate {array} or {undefined} - if typeof === array, then expected objects in array:
     * {
            encounterIndex: index of encounter for update,
            encounter: object with encounter information in HC format.
     * }
     * @returns {Promise} resolve if model updated successfully, else rejected error.
     */
    "updateAfterCreate": (model, arrayWithInfoAboutUpdate) => {
        return new Promise(function (resolve, reject) {
            try {
                _.each(arrayWithInfoAboutUpdate, function (dataForUpdate) {
                    logger.log('Override ', model.encounters[dataForUpdate.encounterIndex], ' to ', dataForUpdate.encounter);
                    model.encounters[dataForUpdate.encounterIndex] = dataForUpdate.encounter;
                });
                return resolve();
            } catch (error) {
                return reject(errors.onCatchHandler(error));
            }
        })
    }
};

module.exports.saveFromFHIR = function (data, strategy, model) {
    return resourceService.saveFromFHIR(data, saveStrategiesHandlers, strategy, model)
};