const mongoose = require('mongoose')
, helpers = require('../lib/model_helpers')
, generator = require('./../generators/model_instance_generator')
, modelsJson = require('./../src/data_model/model-v2.json');

const model = generator.modelInstanceGenerate(modelsJson.models.alerts, "mongoose");

const alertDataSchema = new mongoose.Schema(model, { strict: false, versionKey: false});

const AlertData = mongoose.model('alerts', alertDataSchema);

AlertData.getModel = () => {
    return _.cloneDeep(model);
};

AlertData.getModelJSON = () => {
    return _.cloneDeep(modelsJson.models.alerts);
};


module.exports = AlertData;
