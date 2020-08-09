const Medication = require('../models/medication')
    , CrudService = require('./../services/crud_requests_service').CrudService
    , logger = require('log4js').getLogger()
    , _ = require('lodash')
    , crudService = new CrudService()
    , errors = require("./../errors/errors");

const getEmailFromReq = function (req) {
  return req.decoded.email
};
/**
 * GET /api/medication
 */
exports.medicationList = (req, res) => {
  crudService.readAllWithPresenters(Medication, {}, ["enumsLikeObjectsPresenter"], "medication")
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
      .catch(error => {
          const handledError = errors.errorsHandling(error);
          res.send(handledError.code, handledError.error);
      })
};

/**
 * GET /api/medication/:id
 */
exports.medicationRead = (req, res) => {
  crudService.readByIdWithPresenters(Medication, req, ["enumsLikeObjectsPresenter"], "medication")
      .then(response => {response
        res.json(response);
      })
      .catch(error => {
          const handledError = errors.errorsHandling(error);
          res.send(handledError.code, handledError.error);
      });
};

/**
 * POST /api/medication•
 * Create medication
 */
exports.medicationCreate = (req, res) => {
  crudService.create(Medication, req)
      .then(response => {
        res.json(response);
      })
      .catch(error => {
          const handledError = errors.errorsHandling(error);
          res.send(handledError.code, handledError.error);
      });
};

/**
 * PUT /api/medication/:id
 * Update medication.
 */
exports.medicationUpdate = (req, res) => {
  const updateFunction = crudService.getSimpleUpdateFunction(Medication);
  
  crudService.updateOne(Medication, {_id: req.params.id}, updateFunction, req.body)
      .then(response => {
        res.json(response);
      })
      .catch(error => {
          const handledError = errors.errorsHandling(error);
          res.send(handledError.code, handledError.error);
      });

};

/**
 * DELETE /api/medication/:id
 * remove medication
 */
exports.medicationDelete = (req, res) => {
  crudService.deleteById(Medication, req)
      .then(response => {
        res.send(response);
      })
      .catch(error => {
          const handledError = errors.errorsHandling(error);
          res.send(handledError.code, handledError.error);
      })
};
