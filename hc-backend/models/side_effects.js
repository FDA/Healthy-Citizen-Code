const mongoose = require('mongoose')
    , generator = require('./../generators/model_instance_generator')
    , modelsJson = require('./../src/data_model/model-v2.json')
    , _ = require('lodash');

const model = generator.modelInstanceGenerate(modelsJson.models.sideEffect, "mongoose");

const sideEffectsSchema = new mongoose.Schema(model, { strict: false, versionKey: false});

const SideEffectsData = mongoose.model('sideEffects', sideEffectsSchema);

SideEffectsData.getModel = () => {
    return _.cloneDeep(model);
};

SideEffectsData.getModelJSON = () => {
    return _.cloneDeep(modelsJson.models.sideEffect);
};

module.exports = SideEffectsData;
