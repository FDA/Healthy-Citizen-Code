/**
 * File for process pulled procedures from remote server.
 */


const _ = require('lodash')
    , log4js = require('log4js')
    , logger = log4js.getLogger()
    
    , procedureAdapter = require('../../adapters/phi_and_procedure')
    , resourceService = require('./resource_service')
    , generateEmptyModel = require('./../../generators/empty_phi_generator').generatePhiSubSchema
    , errors = require('./../../errors/errors');

const saveStrategiesHandlers = {
    "createOrUpdate": function (data, model) {
        return new Promise(function (resolve, reject) {
            logger.log('Start create or update procedure');
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
    /**
     *  Function for create new procedures in model. If not exist encounter for current procedure - it will be create.
     * @param data {object} - object with response from remote server in FHIR format.
     * @param model {object} - document for update
     * @returns {Promise} resolve array with data for update existed procedures.
     */
    "create": function (data, model) {
        return new Promise(function (resolve, reject) {
            try {
                let fhirProcedures = data.entry;
                let resolvedArrayForExistedProcedures = [];
                let procedures = resourceService.prepareEncounterChildItems(fhirProcedures, procedureAdapter);
                // _.each(fhirProcedures, function (procedure) {
                //     if (procedure.resource.encounter) {
                //         let linkToEncounter = procedure.resource.encounter.reference.split('/');
                //         linkToEncounter = linkToEncounter[linkToEncounter.length - 1];
                //         let preparedProcedureObj = {
                //             encounterId: linkToEncounter,
                //             procedure: procedureAdapter.fromFHIR(procedure.resource)
                //         };
                //         if (preparedProcedureObj.procedure !== false) {
                //             procedures.push(preparedProcedureObj)
                //         }
                //     } else {
                //         logger.warn('Procedure ', procedure, ' without encounter will be ignore.')
                //     }
                // });

                // find encounter for all procedures
                _.each(procedures, function (procedureObj) {
                    let foundEncounterIndex;
                    _.each(model.encounters, function (encounter, encounterIndex) {
                        if (encounter.encounterId === procedureObj.encounterId) {
                            foundEncounterIndex = encounterIndex;
                            return
                        }
                    });
                    if (foundEncounterIndex === undefined) { // not exist encounter with id procedureObj.encounterId in phi
                        let emptyEncounter = generateEmptyModel("encounters");
                        emptyEncounter.procedures.push(procedureObj.resource);
                        emptyEncounter.encounterId = procedureObj.encounterId;
                        model.encounters.push(emptyEncounter);
                    }
                    else {
                        let proceduresInCurrentEncounter = model.encounters[foundEncounterIndex].procedures;
                        let currentProcedureInEncounterIndex;
                        _.each(proceduresInCurrentEncounter, function (procedureInEncounter, procedureInEncounterIndex) {
                            if (procedureObj.resource.procedureId &&
                                procedureInEncounter.procedureId === procedureObj.resource.procedureId) {
                                // current procedure already pulled
                                currentProcedureInEncounterIndex = procedureInEncounterIndex;
                                return;
                            }
                        });
                        if (!currentProcedureInEncounterIndex) {
                            proceduresInCurrentEncounter.push(procedureObj.resource);
                        } else {
                            resolvedArrayForExistedProcedures.push({
                                encounterIndex: foundEncounterIndex,
                                procedureIndex: currentProcedureInEncounterIndex,
                                procedure: procedureObj.resource
                            })
                        }
                    }
                });
                resolve(resolvedArrayForExistedProcedures);
            }
            catch (error) {
                return reject(errors.onCatchHandler(error));
            }
        })
    },
    /**
     * Function for update procedures in model.
     * @param model - {object} - document for update
     * @param arrayWithInfoAboutUpdate {array} or {undefined} - if typeof === array, then expected objects in array:
     * {
     *      encounterIndex: index of encounter for update,
            procedureIndex: index of procedure for update,
            procedure: object with procedure information in HC format.
     * }
     * @returns {Promise} resolve if model updated successfully, else rejected error.
     */
    "updateAfterCreate": (model, arrayWithInfoAboutUpdate) => {
        return new Promise(function (resolve, reject) {
            try {
                _.each(arrayWithInfoAboutUpdate, function (dataForUpdate) {
                    let procedures = model.encounters[dataForUpdate.encounterIndex].procedures;
                    procedures[dataForUpdate.procedureIndex] = dataForUpdate.procedure;
                    logger.log('Override ', procedures[dataForUpdate.procedureIndex], ' to ', dataForUpdate.procedure);
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
