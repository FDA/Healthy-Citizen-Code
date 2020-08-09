const mongoose = require('mongoose')
, helpers = require('../lib/model_helpers')
	, modelsJson = require('./../src/data_model/model-v2.json')
	, generator = require('./../generators/model_instance_generator')
, _ = require('lodash');

const model = generator.modelInstanceGenerate(modelsJson.models.pii, "mongoose");

const piiDataSchema = new mongoose.Schema(model, { strict: false, versionKey: false});

const PiiData = mongoose.model('piiData', piiDataSchema);

PiiData.normalize = (user) => {
	return helpers.objectNormalize(user, helpers.excludeListPii);
};

PiiData.getModel = () => {
	return _.cloneDeep(model);
};

PiiData.getModelJSON = () => {
	return _.cloneDeep(modelsJson.models.pii);
};

module.exports = PiiData;
