/**
 * File with functionality for pull data from remote server and save it to our database.
 */


const mongoose = require('mongoose')
    , Hospital = require('./../models/hospital')

    , phiClient = require('./../controllers/fhir/phi/client')
    , resourcesMap = require('./fhir/resources_map')

    , modelInstanceGenerator = require('./../generators/model_instance_generator').modelInstanceGenerate
    , modelsJson = require('./../src/data_model/model-v2')
    , model = modelInstanceGenerator(modelsJson.models.phi, "mongoose")

    , _ = require('lodash')
    , log4js = require('log4js')
    , logger = log4js.getLogger()
    , PhiData = require('./../models/phi_data')
    , emptyPhiGenerator = require('./../generators/empty_phi_generator')
    , errors = require('./../errors/errors');


const resourcesConfig = {
    defaultListOfResourcesForSync: ["Encounter", "Procedure", "DiagnosticReport"]
};

let resourceRouter = {
    // "Patient": function (email, url) {
    //     return piiClient.read(email, url)
    // }
    "DiagnosticReport": function (email, url, body) {
        return phiClient.read(url, "DiagnosticReport", "liveFhirFakePatientFindByPatient", {patientId: body.patientId});
    },
    "Encounter": function (email, url, body) {
        return phiClient.read(url, "Encounter", "liveFhirFakePatientFindByPatient", {patientId: body.patientId, _include: "Encounter:location"});
    },
    "Procedure": (email, url, body) => {
        return phiClient.read(url, "Procedure", "liveFhirFakePatientFindByPatientId", {patientId: body.patientId});
    }

};


/**
 * Function for get resources data from remote hospitals.
 * @param email {string} -  email for find resource, it will be refactored later
 * @param hospitalsIdArray {array} array with Id of hospitals.
 * @param listOfResources {array} array with Names of resources, now only procedures
 * @param body {object} - body from request
 * @returns {Promise}
 */
module.exports.searchInfoFromHospitals = function (email, hospitalsIdArray, listOfResources, body) {
    return new Promise(
        function (resolve, reject) {
            
            if (!listOfResources)
                listOfResources = resourcesConfig.defaultListOfResourcesForSync;
            
            const sync = function (hospitalId) {
                return new Promise(function (resolveSync, rejectSync) {
                    Hospital
                        .findById(hospitalId).lean().exec()
                        .then(function (hospital) {
                            if (hospital === null) {
                                logger.trace('Not found hospital by id: ', hospitalId);
                                return resolveSync(null);
                            }
                            logger.log('Find hospital ', hospital);
        
                            let promisesRequestsToRemoteHospitalForResource = [];
                            if (_.isArray(listOfResources)) {
                                _.each(listOfResources, function (resource) {
                                    promisesRequestsToRemoteHospitalForResource.push(resourceRouter[resource](email, hospital.url, body));
                                });
                            } else {
                                promisesRequestsToRemoteHospitalForResource.push(resourceRouter[listOfResources](email, hospital.url, body));
                            }
                            return Promise.all(promisesRequestsToRemoteHospitalForResource);
                        })
                        .then(function (dataFromHospital) {
                            let dataWrapper = [];
                            for (let i = 0; i < dataFromHospital.length; i++) {
                                if (_.isArray(dataFromHospital[i])) {
                                    _.each(dataFromHospital[i], function (resource) {
                                        dataWrapper.push({
                                            'resourceName': listOfResources[i],
                                            'resourceValue': resource,
                                            'email': email
                                        });
                                    })
                                } else {
                                    dataWrapper.push({
                                        'resourceName': listOfResources[i],
                                        'resourceValue': dataFromHospital[i],
                                        'email': email
                                    });
                                }
                            }
                            return resolveSync(dataWrapper);
                        })
                        .catch(function (error) {
                            return rejectSync(errors.onCatchHandler(error));
                        })
                });
            };
            try {
                if (!_.isArray(hospitalsIdArray)) {
                    resolve(sync(hospitalsIdArray));
                }
                else {
                    let promisesAllRequestsToHospital = [];
                    _.each(hospitalsIdArray, function (hospitalId) {
                        promisesAllRequestsToHospital.push(sync(hospitalsIdArray[hospitalId]));
                    });
                    resolve(Promise.all(promisesAllRequestsToHospital));
                }
            } catch (error) {
                return reject(errors.onCatchHandler(error));
            }
        }
    );
};

const containOneCorrectRequest = function (requestsArray) {
    let result = false;
    _.each(requestsArray, function (request) {
        if (request.resourceValue.total > 0 || request.resourceValue.status === 200) {
            result = true;
            return;
        }
    });
    return result
};

/*
 Function for save response from hospitals.
 Default save strategy - createOrUpdate
 */
module.exports.saveResponseFromHospitals = function (responseFromHospitals, saveStrategy = "createOrUpdate") {
    return new Promise(function (resolve, reject) {
    
        if (!containOneCorrectRequest(responseFromHospitals)) {
            return reject(errors.generateError("BadRequestError", "None of requests to remote hospitals are not correct." ));
        }
         
        const email = responseFromHospitals[0].email; // TODO refcator it
        logger.trace(responseFromHospitals);
        PhiData.findOne({email: email}).lean().exec()
            .then(function (result) {
                if (result !== null) {
                    logger.info('UPDATE PHI');
                    return update(result)
                } else {
                    logger.info('CREATE NEW PHI');
                    let phiInstance = emptyPhiGenerator();
                    phiInstance.email = email;
                    return create(phiInstance);
                }
            })
            .then(function (result) {
                resolve(result)
            })
            .catch(function (error) {
                return reject(errors.onCatchHandler(error));
            });
        
        const create = function (phiForCreate) {
            return new Promise(function (resolveCreate, rejectCreate) {
                updateModel(phiForCreate)
                    .then(function () {
                        try {
                            let updatedPhi = new PhiData(phiForCreate);
                            if (updatedPhi) {
                                updatedPhi.save(function (error, phi) {
                                    if (error) {
                                        return rejectCreate(errors.generateError("InternalServerError", error));
                                    }
                                    return resolveCreate(phi);
                                });
                            }
                        } catch (error) {
                            return rejectCreate(errors.generateError("InternalServerError", error));
                        }
                    })
            });
        };
        // TODO refactoring, remove extra find
        const update = function (phiMongooseModel) {
            return new Promise(function (resolveUpdate, rejectUpdate) {
                PhiData.findOne({email: email}, function (error, doc) {
                    if (error) {
                        return rejectUpdate(errors.errorsHandling('InternalServerError', error));
                    }
                    updateModel(doc)
                        .then(function () {
                            doc.save();
                            resolveUpdate(doc);
                        })
                        .catch(function (error) {
                            return rejectUpdate(errors.errorsHandling('InternalServerError', error));
                        })
                })
            });
        };
        
        // WARNING: here changes phiForUpdate, after update. Not copies!
        const updateModel = function (phiForUpdate) {
            let saveResourcePromises = [];
            _.each(responseFromHospitals, function (response) {
                saveResourcePromises.push(
                    resourcesMap[response.resourceName].saveFromFHIR(response.resourceValue, saveStrategy, phiForUpdate)
                );
            });
            return Promise.all(saveResourcePromises)
        };
    
    })
};