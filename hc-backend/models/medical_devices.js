const mongoose = require('mongoose')
    , modelsJson = require('./../src/data_model/model-v2.json')
    , generator = require('./../generators/model_instance_generator')
    , _ = require('lodash');

const model = generator.modelInstanceGenerate(modelsJson.models.medicalDevices, "mongoose");

const medicalDevicesSchema = new mongoose.Schema(model, { strict: false, versionKey: false});

const medicalDevicesData = mongoose.model('medicalDevicesData', medicalDevicesSchema);

medicalDevicesData.getModel = () => {
    console.log('heeeey')
    return _.cloneDeep(model);
};

medicalDevicesData.getModelJSON = () => {
    return _.cloneDeep(modelsJson.models.medicalDevices);
};


module.exports = medicalDevicesData;
