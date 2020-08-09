const mongoose = require('mongoose')
, generator = require('./../generators/model_instance_generator')
, modelsJson = require('./../src/data_model/model-v2.json');

const model = generator.modelInstanceGenerate(modelsJson.models.settings, "mongoose");

const settingsSchema = new mongoose.Schema(model, { strict: false, versionKey: false});

const Settings = mongoose.model('Settings', settingsSchema);


Settings.getModel = () => {
    return _.cloneDeep(model);
};

Settings.getModelJSON = () => {
    return _.cloneDeep(modelsJson.models.settings);
};


module.exports = Settings;
