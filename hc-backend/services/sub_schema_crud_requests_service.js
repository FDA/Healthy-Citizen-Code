const _ = require('lodash')
    , logger = require('log4js').getLogger()
    , modelFieldsValidator = require('./../validators/model_fields_validator')
    , CrudService = require('./crud_requests_service').CrudService
    , dynamicRoutesConfig = require('./../src/data_model/dynamic_routes_config.json')
    , Medications = require('./../models/medication')
    , MedicalDevices = require('./../models/medical_devices')
    , helpers = require('./../lib/parse_algorithms')
    , errors = require('./../errors/errors')
    , lists = require('./../src/data_model/lists')
    , hcCommon = require('hc-common');

const validationShemasMaps = {
    "MD": MedicalDevices,
    "ME": Medications
};

let instance = null;
let crudService = new CrudService();

const generateFullPathToSubSchema = (subSchemaData) => {
    return subSchemaData.modelName + "." + subSchemaData.pathToSubSchema;
};

const preValidationFunctionsMap = {
    "checkProductType": (body) => {
        return new Promise((resolve, reject) => {
            if (!body.productType) {
                return reject(errors.generateError("BadRequestError", "Field productType is required"));
            }
            let isExistedType = false;
            _.each(dynamicRoutesConfig.products.items, function (item) {
                if (item.type === body.productType) {
                    isExistedType = true;
                    return;
                }
            });
            if (isExistedType === false) {
                return reject(errors.generateError("BadRequestError", "Not correct product type"));
            }
            return resolve();
        })
    },
    // we not need validate productType because checkProductType is synchrony function
    "isExistProductWithCode": (body) => {
        return new Promise((resolve, reject) => {
            const model = validationShemasMaps[body.productType];
            if (!body.productCode) {
                return reject(errors.generateError("BadRequestError", "Field productCode is required"));
            }
            if (!model) {
                return reject(errors.generateError("InternalServerError", "Not found model for productType:" + body.productType));
            }
            model.findOne({productCode: body.productCode}).lean().exec()
                .then(result => {
                    if (!result) {
                        return reject(errors.generateError("NotFoundError", "not exist product with code: " + body.productCode + " and type " + body.productType));
                    }
                    resolve()
                })
                .catch(error => {
                    return reject(errors.onCatchHandler(error));
                })
        })
    }
};

const preValidation = (functions, body) => {
    return new Promise((resolve, reject) => {
        let promises =[];
        _.each(functions, function (functionName) {
            promises.push(preValidationFunctionsMap[functionName](body));
        });
        return resolve(Promise.all(promises))
    })
};

const innerFindFunction = (doc, subSchemaData, pathsObj) => {
    if (doc.length > 1) {
        logger.error("Database contain two different instance for model ", subSchemaData.subSchemaName, "with email " + req.decoded.email)
    }
    let subDoc = doc;
    if (_.isArray(doc)) {
        subDoc = doc[0]; // now user can have only one phi data and it's correct.
    }
    _.each(pathsObj, function (pathObj, index) {
        if (!subDoc) {
            subDoc = undefined;
            return;
        }
        if (!subDoc[pathObj.path]) {
            throw errors.generateError("InternalServerError", "Error in innerFindFunction. Not found path " + pathObj.path + " for subDoc " + JSON.stingify(subDoc));
        } else {
            subDoc = subDoc[pathObj.path];
            if (pathObj.id) {
                subDoc = subDoc.id(pathObj.id);
            }
        }
    });
    return subDoc
};


module.exports.SubSchemaCrudService = class SubSchemaCrudService {
    constructor() {
        if (!instance) {
            instance = this;
        }
        return instance;
    }
    
    
    /*
        Function for create new record in sub-schema.
        @param Model - Mongoose Model
        @param query - query for find root model instance. For example phi for current patient - {email: "example@gmail.ru"}
        @param subSchemaData - object with data about sub schema in model. It has format:
             {
                 subSchemaName: subSchemaName,
                 modelName: modelName,
                 pathToSubSchema: pathToSubSchema in format for _.get()
             }
        @param req - req from controller
        @param validationFunctions - array with names of functions for pre-validate body
     */
    create(Model, query, subSchemaData, req, validationFunctions) {
        const body = req.body;
        const params = req.params;
        
        const updateFunction = (body, doc) => {
            return new Promise((resolve, reject) => {
                try {
                    // TODO Add here functionality for auto generate some fields? Add presave for enums.
                    const subSchema = _.get(Model.getModel(), subSchemaData.pathToSubSchema);
                    
                    const newItem = modelFieldsValidator.validate(subSchema, body);
                    
                    if (_.isEmpty(newItem)) {
                        return reject(errors.generateError("BadRequestError", "No correct fields in request"))
                    }
    
                    const modelJSON = _.get(Model.getModelJSON(), subSchemaData.pathToSubSchema);
                    const validationResult = hcCommon.validators.validateObjectWithModel(newItem, modelJSON, lists);
                    if (validationResult !== true) {
                        return reject(errors.generateError("BadRequestError", JSON.stringify(validationResult)));
                    }
                    
                    
                    let pathsToInsertItem = helpers.parseReqParamsForDynamicRoutesAndBuildPaths(subSchemaData.pathToSubSchema, params);
                    let subDoc = doc;
                    _.each(pathsToInsertItem, function (pathObject) {
                        if (!subDoc) {
                            return reject(errors.generateError("BadRequestError", "Not valid params"));
                        }
                        subDoc = subDoc[pathObject.path];
                        if (!subDoc) {
                            return reject(errors.generateError("BadRequestError", "Not valid url"));
                        }
                        if (pathObject.id) {
                            subDoc = subDoc.id(pathObject.id);
                        }
                    });
                    if (!subDoc) {
                        return reject(errors.generateError("NotFoundError", "Not Found data"));
                    }
                    subDoc.push(newItem);
                    return resolve(true);
                }
                catch (error) {
                    return reject(errors.onCatchHandler(error));
                }
            })
            
        };
        
        return new Promise((resolve, reject) => {
            preValidation(validationFunctions, body)
                .then(result => {
                    return crudService.updateOne(Model, query, updateFunction, body)
                })
                .then(response => {
                    return resolve(response);
                })
                .catch(error => {
                    return reject(errors.onCatchHandler(error));
                });
        })
    }
    
    /**
     *
     * @param Model {object} - mongoose model
     * @param req {object} - request data from controller
     * @param arrayWithPresenters {array} - array with presenters
     * @param subSchemaData {object} - object with data about sub schema in model. It has format:
             {
                 subSchemaName: subSchemaName,
                 modelName: modelName,
                 pathToSubSchema: pathToSubSchema in format for _.get()
             }
     * @returns {Promise}
     */
    readAllWithPresenters(Model, req, arrayWithPresenters, subSchemaData) {
        const params = req.params;
        return new Promise((resolve, reject) => {
            try {
                const pathsToInsertItem = helpers.parseReqParamsForDynamicRoutesAndBuildPaths(subSchemaData.pathToSubSchema, params);
    
                const innerFindFunctionWrapper = (doc) => {
                    return innerFindFunction(doc, subSchemaData, pathsToInsertItem)
                };
                const fullPathToSubSchema = generateFullPathToSubSchema(subSchemaData);
                
                
                crudService
                    .readAllWithPresenters(Model, {email: req.decoded.email}, arrayWithPresenters, fullPathToSubSchema, innerFindFunctionWrapper)
                    .then(response => {
                        return resolve(response);
                    })
                    .catch(error => {
                        return reject(errors.onCatchHandler(error));
                    });
            }
            catch (error) {
                return reject(errors.onCatchHandler(error));
            }
        })
    }
    
    /**
     *
     * @param Model {object} - mongoose model
     * @param arrayWithPresenters {array} - array with presenters
     * @param subSchemaData {object} - object with data about sub schema in model. It has format:
             {
                 subSchemaName: subSchemaName,
                 modelName: modelName,
                 pathToSubSchema: pathToSubSchema in format for _.get()
             }
     * @param req {object} - request data from controller
     * @param validationFunctions {array} - array with names of functions for pre-validate body
     * @returns {Promise}
     */
    readByIdWithPresenters(Model, arrayWithPresenters, subSchemaData, req, validationFunctions) {
        return new Promise((resolve, reject) => {
            try {
                const pathsToInsertItem = helpers.parseReqParamsForDynamicRoutesAndBuildPaths(subSchemaData.pathToSubSchema, req.params, true);
                const fullPathToSubSchema = generateFullPathToSubSchema(subSchemaData);
                const innerFindFunctionWrapper = (doc) => {
                    return innerFindFunction(doc, subSchemaData, pathsToInsertItem)
                };
            
            crudService
                .readAllWithPresenters(Model, {email: req.decoded.email}, arrayWithPresenters, fullPathToSubSchema, innerFindFunctionWrapper)
                .then(response => {
                    return resolve(response);
                })
                .catch(error => {
                    return reject(errors.onCatchHandler(error));
                })
            } catch (error) {
                return reject(errors.onCatchHandler(error));
            }
        })
    }
    
    
    /**
     *
     * @param Model {object} - mongoose model
     * @param req {object} - request data from controller
     * @param subSchemaData {object} - object with data about sub schema in model. It has format:
             {
                 subSchemaName: subSchemaName,
                 modelName: modelName,
                 pathToSubSchema: pathToSubSchema in format for _.get()
             }
     * @param validationFunctions {array} - array with names of functions for pre-validate body
     * @returns {Promise}
     */
    update(Model, req, subSchemaData, validationFunctions) {
        const updateFunction = (body, doc) => {
            return new Promise((resolve, reject) => {
                try {
                    const pathsToInsertItem = helpers.parseReqParamsForDynamicRoutesAndBuildPaths(subSchemaData.pathToSubSchema, req.params, true);
                    const innerFindFunctionWrapper = (doc) => {
                        return innerFindFunction(doc, subSchemaData, pathsToInsertItem)
                    };
                    
                    let subDoc = innerFindFunctionWrapper(doc);
                    if (!subDoc) {
                        return reject(errors.generateError("NotFoundError", "Not found sub document"));
                    }
    
                    const subSchema = _.get(Model.getModel(), subSchemaData.pathToSubSchema);
                    const newItem = modelFieldsValidator.validate(subSchema, body);
    
                    const modelJSON = _.get(Model.getModelJSON(), subSchemaData.pathToSubSchema);
                    const validationResult = hcCommon.validators.validateObjectWithModel(newItem, modelJSON, lists);
                    if (validationResult !== true) {

                        return reject(errors.generateError("BadRequestError", JSON.stringify(validationResult)));
                    }
                    
                    _.each(newItem, function (newValue, key) {
                        subDoc[key] = newValue;
                    });
                    return resolve(true);
                }
                catch (error) {
                    return errors.onCatchHandler(error);
                }
            });
        };
    
        return new Promise((resolve, reject) => {
            preValidation(validationFunctions, req.body)
                .then(result => {
                    return crudService.updateOne(Model, {email: req.decoded.email}, updateFunction, req.body)
                })
                .then(response => {
                    return resolve(response);
                })
                .catch(error => {
                    return reject(errors.onCatchHandler(error));
                });
        });
    }
    
    /**
     *
     * @param Model {object} - mongoose model
     * @param req {object} - request data from controller
     * @param subSchemaData {object} - object with data about sub schema in model. It has format:
             {
                 subSchemaName: subSchemaName,
                 modelName: modelName,
                 pathToSubSchema: pathToSubSchema in format for _.get()
             }
     * @param validationFunctions {array} - array with names of functions for pre-validate body
     * @returns {Promise}
     */
    deleteById(Model, req, subSchemaData, validationFunctions){
        const updateFunction = (body, doc) => {
            return new Promise((resolve, reject) => {
                try {
    
                    const pathsToInsertItem = helpers.parseReqParamsForDynamicRoutesAndBuildPaths(subSchemaData.pathToSubSchema, req.params, true);
                    const idForRemovedItem = pathsToInsertItem[pathsToInsertItem.length - 1].id;
                    delete pathsToInsertItem[pathsToInsertItem.length - 1].id;
                    
                    const innerFindFunctionWrapper = (doc) => {
                        return innerFindFunction(doc, subSchemaData, pathsToInsertItem)
                    };
    
                    let subDoc = innerFindFunctionWrapper(doc);
                    if (!subDoc) {
                        return reject(errors.generateError("NotFoundError", "Not found sub schema"))
                    }
                    subDoc.pull({_id: idForRemovedItem});
                    return resolve(true);
                }
                catch (error) {
                    errors.onCatchHandler(error);
                }
            })
        };
    
        return new Promise((resolve, reject) => {
            crudService
                .updateOne(Model, {email: req.decoded.email}, updateFunction)
                .then(response => {
                    return resolve(response);
                })
                .catch(error => {
                    return reject(errors.onCatchHandler(error));
                });
        });
    }
    
};