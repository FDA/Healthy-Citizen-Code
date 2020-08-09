const MedicalDevices = require('../models/medical_devices')
    , CrudService = require('./../services/crud_requests_service').CrudService
    , _ = require('lodash')
    , crudService = new CrudService()
    , errors = require('./../errors/errors');
/**
 * GET /api/medical-devices
 */
exports.medicalDevicesList = (req, res) => {
    
    crudService.readAllWithPresenters(MedicalDevices, {}, ["enumsLikeObjectsPresenter"], "medicalDevices")
        .then(result => {
            let devicesMap = {};
            if(result.data === undefined){
                return res.json(204, {
                    data: []
                });
            }
            result.data.forEach(function(data) {
                devicesMap[data._id] = data;
            });
            result.data = devicesMap;
            res.json(result);
        })
        .catch(errorResponse => {
            const handledError = errors.errorsHandling(errorResponse);
            res.send(handledError.code, handledError.error);
        })
};

/**
 * GET /api/medical-devices/:id
 */
exports.medicalDevicesRead = (req, res) => {
    crudService.readByIdWithPresenters(MedicalDevices, req, ["enumsLikeObjectsPresenter"], "medicalDevices")
        .then(response => {
            res.json(response);
        })
        .catch(errorResponse => {
            const handledError = errors.errorsHandling(errorResponse);
            res.send(handledError.code, handledError.error);
        });
};

/**
 * POST /api/medical-devices
 * Create medical-devices
 */
exports.medicalDevicesCreate = (req, res) => {
    crudService.create(MedicalDevices, req)
        .then(response => {
            res.json(response);
        })
        .catch(errorResponse => {
            const handledError = errors.errorsHandling(errorResponse);
            res.send(handledError.code, handledError.error);
        });
};

/**
 * PUT /api/medical-devices/:id
 * Update medical-devices.
 */
exports.medicalDevicesUpdate = (req, res) => {
    const updateFunction = crudService.getSimpleUpdateFunction(MedicalDevices);
    
    crudService.updateOne(MedicalDevices, {_id: req.params.id}, updateFunction, req.body)
        .then(response => {
            res.json(response);
        })
        .catch(errorResponse => {
            const handledError = errors.errorsHandling(errorResponse);
            res.send(handledError.code, handledError.error);
        });
};

/**
 * DELETE /api/medical-devices/:id
 * remove medical-devices
 */
exports.medicalDevicesDelete = (req, res) => {
    crudService.deleteById(MedicalDevices, req)
        .then(response => {
            res.send(response);
        })
        .catch(errorResponse => {
            const handledError = errors.errorsHandling(errorResponse);
            res.send(handledError.code, handledError.error);
        })
};

