const _ = require('lodash')
	, Settings = require('../models/settings')
	, generator = require('../generators/model_instance_generator')
	, model = require('./../src/data_model/model-v2.json').models
	, onlyVisibleFieldsPresenters = require('./../presenters/only_visible_fields_presenter');
/**
 * GET /api
 * List of API examples.
 */
exports.getApi = (req, res) => {
  res.json({
    "title": 'API Examples'
  });
};


var fixSchema = (Schema) => {
	for(var key in Schema){
		var field = Schema[key];

		if(_.isArray(field)){
			// TODO: rewrite as normal array (not sure will it be more than one item here os not!)
			field[0] = fixSchema(field[0]);
		}

		if(!field.hasOwnProperty('type')){
			// TODO: rewrite as normal array (not sure will it be more than one item here os not!)
			field = fixSchema(field);
		}

		if(field.type !== undefined){
			switch(field.type){
				case String:
					field.type = 'String';
				break;
      	case Number:
					field.type = 'Number';
				break;
				case Date:
					field.type = 'Date';
        break;
        case Boolean:
					field.type = 'Boolean';
				break;
			}
		}
	}
	return Schema;
};
module.exports.fixSchema = fixSchema;


/**
 * GET /api/schema
 */
exports.schema = (req, res) => {
	let schema = generator.modelInstanceGenerate(model, "form");
	onlyVisibleFieldsPresenters(schema, schema);
	
	res.json({
		status: 200,
		name: 'schema', // TODO fix it if front-end not broke after change
		data: schema
	});
};

/**
 * GET /api/userSchema
 */
exports.userSchema = (req, res) => {
	let pii = fixSchema(generator.modelInstanceGenerate(model.pii, "form"));

	res.json({
		name: 'userSchema', // TODO fix it if front-end not broke after change
		data: pii
	});
};

/**
 * GET /api/phiDataSchema
 */
exports.phiDataSchema = (req, res) => {
	let phi = fixSchema(generator.modelInstanceGenerate(model.phi, "form"));

	res.json({
		name: 'phiDataSchema',
		data: phi
	});
};

/**
 * GET /api/piiDataSchema
 */
exports.piiDataSchema = (req, res) => {
	let pii = fixSchema(generator.modelInstanceGenerate(model.pii, "form"));

	res.json({
		name: 'piiDataSchema',
		data: pii
	});
};

/**
 * GET /api/settingsSchema
 */
exports.settingsSchema = (req, res) => {
	let settingsSchema = fixSchema(generator.modelInstanceGenerate(model.settings, "form"));

	res.json({
		name: 'settingsSchema',
		data: settingsSchema
	});
};


/**
 * GET /api/medicationSchema
 */
exports.medicationSchema = (req, res) => {
	let medicationSchema = fixSchema(generator.modelInstanceGenerate(model.medication, "form"));

	res.json({
		name: 'medicationSchema',
		data: medicationSchema
	});
};
