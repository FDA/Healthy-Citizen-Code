const PhiData = require('../models/phi_data')
    , enumsLikeObjectsPresenter = require('./../presenters/enum_like_objects')
    , onlyVisibleFieldsPresenter = require('./../presenters/only_visible_fields_presenter')
    , modelJson = require('./../src/data_model/model-v2.json')
    , modelFieldsValidator = require('./../validators/model_fields_validator')
    , SubSchemaCrudService = require('./../services/sub_schema_crud_requests_service').SubSchemaCrudService
    , errors = require('./../errors/errors')
    , logger = require('log4js');


/**
 * GET /api/phidata
 */
exports.phiDataList = (req, res) => {
  var promise = PhiData.findOne({email: req.decoded.email}).lean().exec();

  promise
    .then(phiData => {
      if (phiData === null) {
        return res.json(204, {code: 204, message: "Phi not found"});
      }

      phiData = PhiData.normalize(phiData);
      phiData = enumsLikeObjectsPresenter(modelJson.models.phi, phiData);
      res.json(phiData)
    }, err => {
        
      console.log(err);
      res.json(err);
    });
};

/**
 * GET /api/phidata/:id
 */
exports.phiDataRead = (req, res) => {
  var _id = req.params.id;

  var promise = PhiData.findById(_id).lean().exec();
  promise
    .then(function(phiData){
        phiData = PhiData.normalize(phiData);
        phiData = enumsLikeObjectsPresenter(modelJson.models.phi, phiData);
        phiData = onlyVisibleFieldsPresenter(modelJson.models.phi, phiData);
      res.json(phiData);
    })
    .catch(function(err){
      res.json(500, {
        code: 500,
        error: err
      });
    });
};

/**
 * POST /api/phidata
 * Create phiData
 */
exports.phiDataCreate = (req, res) => {
  const phiDataJSON = req.body;
  const validatedUPhi = modelFieldsValidator.validate(PhiData.getModel(), phiDataJSON);
  let phiData = new PhiData(validatedUPhi);

  phiData.save(function(error){
    if (error){
        logger.error(error);
        return res.json(500, {message: "internal server error"});
    }
    return res.json(phiData);
  });
};

/**
 * PUT /api/phidata/:id
 * Update phiData.
 */
exports.phiDataUpdate = (req, res) => {
  var id = req.params.id;

  res.json({
    name: 'phiDataUpdate',
    id: id
  });

};

/**
 * DELETE /api/phidata/:id
 * remove phiData
 */
exports.phiDataDelete = (req, res) => {
  var id = req.params.id;

  res.json({
    name: 'phiDataDelete',
    id: id
  });

};

/**
 * GET /api/phidata/by-email/:email
 */
exports.phiFindByEmail = (req, res) => {
  var email = req.params.email;
  var promise = PhiData.findOne({email: email}).lean().exec();

  promise
    .then((phiData) => {
      phiData = PhiData.normalize(phiData);
      phiData = enumsLikeObjectsPresenter(modelJson.models.phi, phiData);
      return res.json(200, phiData);
    })
    .catch((err) => {
      return res.json(500, {
        code: 500,
        error: err
      });
    });
};



const subSchemaCrudService = new SubSchemaCrudService();
/**
 * GET /api/products-main
 */
exports.mainInfoAboutProducts = (req, res) => {
    subSchemaCrudService
        .readAllWithPresenters(PhiData,
            req,
            ["productsInfoForSideEffects"],
            {modelName: "phi", subSchemaName: "products", pathToSubSchema: "products[0]"}
        )
        .then(response => {
            res.json(response);
        })
        .catch(errorResponse => {
            res.json(errorResponse);
        });
};

