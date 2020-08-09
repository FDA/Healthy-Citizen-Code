const mongoose = require('mongoose')
, generator = require('./../generators/model_instance_generator')
, modelsJson = require('./../src/data_model/model-v2.json');

const model = generator.modelInstanceGenerate(modelsJson.models.hospital, "mongoose");

const hospitalSchema = new mongoose.Schema(model, { strict: false, versionKey: false });

const Hospital = mongoose.model('Hospital', hospitalSchema);

module.exports = Hospital;
