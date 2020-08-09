const SubSchemaCrudService = require('./../services/sub_schema_crud_requests_service').SubSchemaCrudService
    , _ = require('lodash')
    , errorsWrapper = require('../errors/errors');

const subSchemaCrudService = new SubSchemaCrudService();

    module.exports.SubSchemasDynamicController = class SubSchemasDynamicController {
    
    constructor(model, subSchemaName, modelName, pathToSubSchema) {
        this.model = model;
        this.subSchemaData = {
            subSchemaName: subSchemaName,
            modelName: modelName,
            pathToSubSchema: pathToSubSchema
        };
        this.subSchemaName = subSchemaName; // TODO remove it later
        this.modelName = modelName;
        this.pathToSubSchema = pathToSubSchema;
    }
    
    create(validationFunctions) {

        const that = this;
        return function (req, res) {
            subSchemaCrudService
                .create(that.model,
                    {email: req.decoded.email},
                    that.subSchemaData,
                    req,
                    validationFunctions
                )
                .then(response => {
                    res.json(response);
                })
                .catch(errorResponse => {
                    const handledError = errorsWrapper.errorsHandling(errorResponse);
                    res.send(handledError.code, handledError.error);
                });
        }
    }
    
    readAll(validationFunctions) {
        const that = this;
        return function (req, res) {
            let query = _.cloneDeep(req.query);
            delete query.token;
            
            subSchemaCrudService
                .readAllWithPresenters(that.model,
                    req,
                    ["normalize", "enumsLikeObjectsPresenter"],
                    that.subSchemaData,
                    validationFunctions
                )
                .then(response => {
                    let filteredData = [];
                    if (response.data && _.isArray(response.data) && !_.isArray(query)) {
                        _.each(response.data, function (data, i) {
                            let isCorrectData = true;
                            _.each(query, function (value, key) {
                                
                                if (!data[key]) {
                                    isCorrectData = false;
                                    return
                                }
                                if (value !== data[key].toString()) {
                                    isCorrectData = false;
                                    return;
                                }
                            });

                            if (isCorrectData === true) {
                                filteredData.push(response.data[i]);
                            }
                        });
                        response.data = filteredData;
                    }
                    res.json(response);
                })
                .catch(errorResponse => {
                    const handledError = errorsWrapper.errorsHandling(errorResponse);
                    res.send(handledError.code, handledError.error);
                });
        };
    }
    
    readById(validationFunctions) {
        const that = this;
        return function (req, res) {
            subSchemaCrudService
                .readByIdWithPresenters(that.model,
                    ["normalize", "enumsLikeObjectsPresenter"],
                    that.subSchemaData,
                    req,
                    validationFunctions
                )
                .then(response => {
                    res.json(response);
                })
                .catch(errorResponse => {
                    const handledError = errorsWrapper.errorsHandling(errorResponse);
                    res.send(handledError.code, handledError.error);
                })
        }
    }
    
    readAllFromChildSchema(childSchemaName) {
        const that = this;
        return (req, res) => {
            let query = _.cloneDeep(req.query);
            delete query.token;
    
            subSchemaCrudService
                .readAllWithPresenters(this.model,
                    req,
                    ["normalize", "enumsLikeObjectsPresenter"],
                    this.subSchemaData
                )
                .then(response => {
                    let filteredData = [];
                    if (response.data && _.isArray(response.data)) {
                        _.each(response.data, function (data, i) {
                            let subSchemaArray = data[childSchemaName];
                            const id = data._id;
                            _.each(subSchemaArray, function (item) {
                                let newItem = item;
                                newItem["_parentId"] = id;
                                filteredData.push(newItem);
                            })
                        });
                        response.data = filteredData;
                    }
                    res.json(response);
                })
                .catch(errorResponse => {
                    const handledError = errorsWrapper.errorsHandling(errorResponse);
                    res.send(handledError.code, handledError.error);
                });
        }
    }
    
    update(validationFunctions) {
        const that = this;
        return function (req, res) {
            subSchemaCrudService
                .update(that.model,
                    req,
                    that.subSchemaData,
                    validationFunctions
                )
                .then(response => {
                    res.json(response);
                })
                .catch(errorResponse => {
                    const handledError = errorsWrapper.errorsHandling(errorResponse);
                    res.send(handledError.code, handledError.error);
                });
        }
    }
    
    deleteById(validationFunctions) {
        const that = this;
        return function (req, res) {
            subSchemaCrudService
                .deleteById(that.model,
                    req,
                    that.subSchemaData,
                    validationFunctions
                )
                .then(response => {
                    res.json(response);
                })
                .catch(errorResponse => {
                    const handledError = errorsWrapper.errorsHandling(errorResponse);
                    res.send(handledError.code, handledError.error);
                });
        }
    }
};