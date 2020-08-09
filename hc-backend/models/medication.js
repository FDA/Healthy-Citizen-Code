const mongoose = require('mongoose')
    , helpers = require('../lib/model_helpers')
    , generator = require('./../generators/model_instance_generator')
    , modelsJson = require('./../src/data_model/model-v2.json')
    , _ = require('lodash');

const medicationSchema = new mongoose.Schema(modelsJson.models.medication , { strict: false});

const Medication = mongoose.model('Medication', medicationSchema);

Medication.getModel = () => {
    return _.cloneDeep(modelsJson.models.medication);
};


Medication.getModelJSON = () => {
    return _.cloneDeep(modelsJson.models.medication);
};


module.exports = Medication;
