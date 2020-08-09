const mongoose = require('mongoose')
, helpers = require('../lib/model_helpers')
, generator = require('./../generators/model_instance_generator')
, modelsJson = require('./../src/data_model/model-v2.json')
, _ = require('lodash');

const model = generator.modelInstanceGenerate(modelsJson.models.phi, "mongoose");

const phiDataSchema = new mongoose.Schema(model, { strict: false, versionKey: false});

const PhiData = mongoose.model('phiData', phiDataSchema);

PhiData.normalize = (user) => {
	return helpers.objectNormalize(user, helpers.excludeListPhi);
};
PhiData.getModel = () => {
	return _.cloneDeep(model);
};

PhiData.getModelJSON = () => {
	return _.cloneDeep(modelsJson.models.phi);
};

module.exports = PhiData;
