const _ = require('lodash')
    , logger = require('log4js').getLogger()
    , modelFieldsValidator = require('./../validators/model_fields_validator')
    , CrudService = require('./crud_requests_service').CrudService
    , PhiModel = require('./../models/phi_data')
    , errors = require('./../errors/errors');

let instance = null;
let crudService = new CrudService();


const checkProductInPhi = (email, productCode) => {
    return new Promise((resolve, reject) => {
        PhiModel.findOne({email: email}).lean().exec()
            .then(result => {
                if (!result.products) {
                    return reject(errors.generateError("BadRequestError", "Can not found products"));
                }
                let foundProductForSideEffect = false;
                _.each(result.products, function (product) {
                    if (product.productCode === productCode) {
                        foundProductForSideEffect = true;
                        return
                    }
                });
                if (!foundProductForSideEffect) {
                    return reject(errors.generateError("BadRequestError", "Can not found product with code " + productCode));
                }
                return resolve(true);
            })
    })
};


module.exports.SideEffectsService = class SideEffectsService {
    constructor() {
        if (!instance) {
            instance = this;
        }
        return instance;
    }
    
    create(Model, req) {
        return new Promise((resolve, reject) => {
            const email = req.decoded.email;
            const bodyWrapper = {};
            bodyWrapper.body = _.cloneDeep(req.body);
            if (!bodyWrapper.body.productCode) {
                return reject(errors.generateError("BadRequestError", "productCode is required field"));
            }
            checkProductInPhi(email, bodyWrapper.body.productCode)
                .then(result => {
                    bodyWrapper.body.email = email;
                    return  crudService.create(Model, bodyWrapper)
                })
                .then(response => {
                    return resolve(response);
                })
                .catch(error => {
                    return reject(errors.onCatchHandler(error));
                });
        });
    }
    
    
    readAll(Model, req) {
        return new Promise((resolve, reject) => {
            crudService
                .readAll(Model, {email: req.decoded.email})
                .then(response => {
                    let sideEffectsMap = {};
                    if (response.data) {
                        response.data.forEach(function(data) {
                            sideEffectsMap[data._id] = data;
                        });
                        response.data = sideEffectsMap;
                    }
                    return resolve(response);
                })
                .catch(error => {
                    return reject(errors.onCatchHandler(error));
                });
        })
    }
    
    
    readById(Model, req) {
        return new Promise((resolve, reject) => {
            crudService.readById(Model, req)
                .then(response => {
                    if (response.data.email !== req.decoded.email) {
                        return errors.generateError("ForbiddenError", "Access is denied");
                    }
                    return resolve(response);
                })
                .catch(error => {
                    return reject(errors.onCatchHandler(error));
                })
        })
    }
    
    

    
    update(Model, req) {
        const body = req.body;
        
        const updateFunction = (body, doc) => {
            return new Promise((resolve, reject) => {
                try {
                    const newItem = modelFieldsValidator.validate(Model.getModel(), body);
                    if (doc.length < 1) {
                        return reject(errors.generateError("NotFoundError", "Not found side effects collections"));
                    }
                    if (body.productCode) {
                        checkProductInPhi(req.decoded.email, body.productCode)
                    }
                    _.each(newItem, function (value, key) {
                        doc[key] = value;
                    });
                    return resolve();
                }
                catch (error) {
                    return reject(errors.onCatchHandler(error));
                }
            })
        };

        return new Promise((resolve, reject) => {
            crudService
                .updateOne(Model, {email: req.decoded.email, _id: req.params.id}, updateFunction, body)
                .then(response => {
                    return resolve(response);
                })
                .catch(error => {
                    return reject(errors.onCatchHandler(error));
                });
        });
    }

    
    deleteById(Model, req){
        return new Promise((resolve, reject) => {
            const checkUserFunction = (doc) => {
                return doc.email === req.decoded.email;
            };
            
            crudService
                .deleteById(Model, req, checkUserFunction)
                .then(response => {
                    return resolve(response);
                })
                .catch(error => {
                    return reject(errors.onCatchHandler(error));
                });
        });
    }
};