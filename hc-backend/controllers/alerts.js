const Alerts = require('../models/alerts')
    , crudService = require('./../services/crud_requests_service')
    , modelsJson = require('./../src/data_model/model-v2.json')
    , instanceGenerator = require('./../generators/model_instance_generator').modelInstanceGenerate;

const alertMongooseModel = instanceGenerator(modelsJson.models.alerts, "mongoose");

/**
 * GET /api/alerts
 */
const ALERTS_COUNT = 10; // TODO move it to config, or expect count from front-end
exports.alertsList = (req, res) => {
    Alerts.find({})
        .sort({'created': -1})
        .limit(ALERTS_COUNT)
        .exec(function(err, alerts) {
            if (err) {
                return res.send({status: 400, error: err})
            }
            let alertsMap = {};
            alerts.forEach(function(data) {
                alertsMap[data._id] = data;
            });
            res.json({status:200, items: alertsMap});
        });
};

/**
 * GET /api/alerts/:id
 */
exports.alertRead = (req, res) => {
    var _id = req.params.id;
    
    var promise = Alerts.findById(_id).exec();

    promise
        .then(function(alerts){
            if (alerts === null) {
                return res.json({status: 404, error: "Alerts not found"})
            }
            return res.json({status: 200, item: alerts});
        })
        .catch(function(err){
            res.json({
                code: 500,
                error: err
            });
        });
};

/**
 * POST /api/alerts
 * Create alerts
 */
exports.alertCreate = (req, res) => {
    const alertJSON = req.body;
    var alert = new Alerts(alertJSON);
    
    var response = {}
    alert.save(function(err){
        if (err){
            response = {
                code: 500,
                error: err
            };
        }
    });
    
    response = alert;
    
    res.json(response);
};

/**
 * PUT /api/alerts/:id
 * Update alerts.
 */
exports.alertUpdate = (req, res) => {
    const id = req.params.id;
    const body = req.body;
    
    res.json({
        status: 200,
        item: "uddateService"
    });
};

/**
 * DELETE /api/alerts/:id
 * remove alerts
 */
exports.alertDelete = (req, res) => {
    const id = req.params.id;
    crudService.delete(Alerts, id)
        .then(function (result) {
            return res.json({
                status: 201
            });
        })
        .catch(function (rejectObj) {
            return res.json({
                error: rejectObj.message,
                status: 300
            });
        });
};
