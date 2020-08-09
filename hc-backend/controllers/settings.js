const Settings = require('../models/settings')

    , CrudService = require('./../services/crud_requests_service').CrudService
    , errors = require('./../errors/errors');

const crudService = new CrudService();
/**
 * GET /api/settings
 */
exports.settingsList = (req, res) => {

  crudService.readAll(Settings, {})
      .then(result => {
        let settingsMap = {};
        if(result.data === undefined){
          res.json(404, {
            code: 404,
            message: 'no records found',
          });
        }
        result.data.forEach(function(data) {
            settingsMap[data._id] = data;
          });
        result.data = settingsMap;
        res.json(result);
      })
      .catch(errorResponse => {
          const handledError = errors.errorsHandling(errorResponse);
          res.send(handledError.code, handledError.error);
      })
};

/**
 * GET /api/settings/:id
 */
exports.settingsRead = (req, res) => {
    crudService.readById(Settings, req)
        .then(response => {
            res.json(response);
        })
        .catch(err => {
            const handledError = errors.errorsHandling(errorResponse);
            res.send(handledError.code, handledError.error);
        });
};

/**
 * POST /api/settings
 * Create settings
 */
exports.settingsCreate = (req, res) => {
    crudService.create(Settings, req)
        .then(response => {
            res.json(response);
        })
        .catch(errorResponse => {
            const handledError = errors.errorsHandling(errorResponse);
            res.send(handledError.code, handledError.error);
        });
};

/**
 * PUT /api/settings/:id
 * Update settings.
 */
exports.settingsUpdate = (req, res) => {
  var id = req.params.id;

  res.json({
    name: 'settingsUpdate',
    id: id
  });

};

/**
 * DELETE /api/settings/:id
 * remove settings
 */
exports.settingsDelete = (req, res) => {
    crudService.deleteById(Settings, req)
        .then(response => {
            res.send(response);
        })
        .catch(errorResponse => {
            const handledError = errors.errorsHandling(errorResponse);
            res.send(handledError.code, handledError.error);
        })
};

