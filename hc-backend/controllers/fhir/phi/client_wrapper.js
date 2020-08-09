const client = require("./client");
const modelInstanceGenerator = require('./../../../generators/model_instance_generator').modelInstanceGenerate;
const modelJson = require('../../../src/data_model/model-v2.json').models.phi;
const model = modelInstanceGenerator(modelJson, 'mongoose');

module.exports.read = (req, res) => {
    const _id = req.params.id;
    client
        .read(_id)
        .then(function (phi) {
            res.json(phi);
        })
        .catch(function(err){
            res.json({
                code: 500,
                error: err
            });
        });
};

module.exports.create = (req, res) => {
    // generate fake phi
    const phi = modelInstanceGenerator(model.phiDataSchema, "instance");
    client
        .create(phi)
        .then(function (response) {
            res.json(response);
        })
        .catch(function(err){
            res.json({
                code: 500,
                error: err
            });
        });
};