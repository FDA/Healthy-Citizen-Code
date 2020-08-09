const client = require("./client");
const modelInstanceGenerator = require('./../../../generators/model_instance_generator').modelInstanceGenerate;
const modelJson = require('../../../src/data_model/model-v2.json').models.settings;
const model = modelInstanceGenerator(modelJson, 'mongoose');

module.exports.read = (req, res) => {
    const _id = req.params.id;
    client
        .read(_id)
        .then(function (settings) {
            res.json(settings);
        })
        .catch(function(err){
            res.json({
                code: 500,
                error: err
            });
        });
};

module.exports.create = (req, res) => {
    // generate fake setting
    const settings = modelInstanceGenerator(model.settingsSchema, "instance");
    client
        .create(settings)
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