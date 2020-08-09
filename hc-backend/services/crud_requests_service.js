const _ = require('lodash')
    , modelsJSON = require('./../src/data_model/model-v2.json').models
    , logger = require('log4js').getLogger()
    , modelFieldsValidator = require('./../validators/model_fields_validator')
    , enumsLikeObjectsPresenter = require('./../presenters/enum_like_objects')
    , onlyVisibleFieldsPresenter = require('./../presenters/only_visible_fields_presenter')
    , productsInfoForSideEffectsPresenter = require("./../presenters/products_info_for_side_effects")
    , errors = require('./../errors/errors')
    , hcCommon = require('hc-common')
    , lists = require('./../src/data_model/lists');



const getPresentersMap = (model) => {
    return {
        enumsLikeObjectsPresenter: enumsLikeObjectsPresenter,
        onlyVisibleFieldsPresenter: onlyVisibleFieldsPresenter,
        normalize: model.normalize,
        productsInfoForSideEffects: productsInfoForSideEffectsPresenter
    }
};

// Class for basic crud operations.
// It is singleton.
let instance = null;
module.exports.CrudService = class CrudService {
    constructor() {
        if (!instance) {
            instance = this;
        }
        return instance;
    }
    
    create(Model, req) {
        return new Promise((resolve, reject) => {
            try {
                const body = req.body;
                const modelJSON = Model.getModelJSON();
                const bodyWithoutExtraFields = modelFieldsValidator.validate(Model.getModel(), body);
                const validationResult = hcCommon.validators.validateObjectWithModel(bodyWithoutExtraFields, modelJSON, lists);
                if (validationResult !== true) {
                    return reject(errors.generateError("BadRequestError", JSON.stringify(validationResult)));
                }
                let modelData = new Model(bodyWithoutExtraFields);
                modelData.save(function (err) {
                    if (err) {
                        return reject(errors.generateError("InternalServerError", err));
                    }
                    return resolve({
                        code: 201,
                        data: modelData
                    });
                });
            } catch (error) {
                return reject(errors.onCatchHandler(error));
            }
        });
    }
    
    /*
        READ METHODS
     */
    
    /*
        Function for find collection in database.
        @param Model - mongoose model
        @param params - query for find
        @subSchemasFindFunction - function for find sub-schemas in collections. Expected function format
            function (doc) {
                ...
                return new data
            }
     */
    readAll(Model, params, subSchemasFindFunction) {
        return new Promise((resolve, reject) => {
            try {
                Model.find(params, function (error, result) {
                    if (error) {
                        return reject(errors.generateError("InternalServerError", error));
                    }
                    if (result.length === 0) {
                        return resolve({status: 204});
                    }
                    if (subSchemasFindFunction) {
                        result = subSchemasFindFunction(result);
                        if (!result) {
                            return reject(errors.generateError("NotFoundError" , "Not found data"));
                        }
                    }
                    if (result !== null && result.toObject) {
                        result = result.toObject()
                    }
                    return resolve({status: 200, data: result});
                });
            }
            catch (error) {
                return reject(errors.onCatchHandler(error));
            }
        });
    }
    readAllWithPresenters(Model, params, arrayWithPresenters, fullPathModel, subSchemasFindFunction) {
        return new Promise((resolve, reject) => {
            try {
                this.readAll(Model, params, subSchemasFindFunction)
                    .then(response => {
                        const presentersMap = getPresentersMap(Model);
                        _.each(response.data, (responseOneItem => {
                            _.each(arrayWithPresenters, (presenterName => {
                                if (presentersMap[presenterName]) {
                                    presentersMap[presenterName](_.get(modelsJSON, fullPathModel), responseOneItem);
                                } else {
                                    logger.warn("Undefined presenter name: ", presenterName);
                                }
                            }));
                        }));
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
    readById(Model, req) {
        const _id = req.params.id;
        return new Promise(
            function (resolve, reject) {
                Model.findById(_id).lean().exec()
                    .then(result => {
                        if (result === null) {
                            return resolve({status: 204})
                        }
                        return resolve({status: 200, data: result})
                    })
                    .catch(error => {
                        return reject(errors.onCatchHandler(error));
                    })
            })
    }
    readByIdWithPresenters(Model, req, arrayWithPresenters, modelName) {
        return new Promise(
            (resolve, reject) => {
                this.readById(Model, req)
                    .then(response => {
                        const presentersMap = getPresentersMap(Model);
                        _.each(arrayWithPresenters, (presenterName => {
                            presentersMap[presenterName](modelName, response.data);
                        }));
                        return resolve(response);
                    })
                    .catch(error => {
                        return reject(error);
                    });
            })
    }
    
    /*
        UPDATE METHODS
     */
    // expected updateModelFunction structure:
    // return values: if successful return true, else false
    updateOne(Model, query, updateModelFunction, body) {
        return new Promise((resolve, reject) => {
            if (typeof updateModelFunction !== "function") {
                return reject(errors.generateError("InternalServerError", "Expected argument function for update in updateOne method in crudService."));
            }
            Model.findOne(query, function (error, doc) {
                if (error) {
                    return reject(errors.generateError("InternalServerError", error));
                }
                if (doc === null) {
                    return reject(errors.generateError("NotFoundError", "Not found element for update"));
                }
                updateModelFunction(body, doc)
                    .then(result => {
                        doc.save(function(saveErrors) {
                            if (saveErrors) {
                                return reject(errors.generateError("InternalServerError", saveErrors))
                            }
                            return resolve({status: 200});
                        })
                    })
                    .catch(error => {
                        return reject(errors.onCatchHandler(error));
                    });
            })
        })
    };
    
    
    /*
        DELETE METHODS
     */
    deleteById(Model, req, preRemoveCheckFunction) {
        const id = req.params.id;
        return new Promise(function (resolve, reject) {
            try {
                Model.findById(id, function (error, doc) {
                    if (error) {
                        return reject(errors.generateError("InternalServerError", error));
                    }
                    if (!doc) {
                        return resolve({
                            status: 204
                        });
                    }
                    if (preRemoveCheckFunction) {
                        if (!preRemoveCheckFunction(doc)) {
                            return reject(errors.generateError("ForbiddenError", "Pre-remove check document error"));
                        }
                    }
                    doc.remove(function (error) {
                        if (error) {
                            return reject(errors.generateError("InternalServerError", error));
                        }
                        return resolve({status: 200});
                    });
                });
            } catch (error) {
                return reject(errors.onCatchHandler(error));
            }
        });
    }
    
    
    
    getSimpleUpdateFunction(Model) {
        return (body, doc) => {
            return new Promise((resolve, reject) => {
                try {
                    const dataForInsertWithoutExtraFields = modelFieldsValidator.validate(Model.getModel(), body);
                    const validationResult = hcCommon.validators.validateObjectWithModel(dataForInsertWithoutExtraFields, Model.getModelJSON(), lists);
                    if (validationResult !== true) {
                        return reject(errors.generateError("BadRequestError", JSON.stringify(validationResult)));
                    }
                    _.each(dataForInsertWithoutExtraFields, function (value, key) {
                        doc[key] = value;
                    });
                    return resolve();
                }
                catch (error) {
                    return reject(errors.onCatchHandler(error));
                }
            })
        };
    }
};