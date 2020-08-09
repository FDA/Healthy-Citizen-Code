"use strict";

const phiDataController = require("../controllers/phi_data")
	, auth = require("./auth")
	, _ = require('lodash')
	, phiModel = require('./../src/data_model/model-v2.json')
	, PhiModel = require('../models/phi_data')
	, dynamicRoutesService = require('./../services/sub_schema_dynamic_routes_service');

module.exports = app => {
	// PhiData endpoints
	app.get('/api/phidata', auth.isAuthenticated, phiDataController.phiDataList);
	app.get('/api/phidata/:id', auth.isAuthenticated, phiDataController.phiDataRead);
	app.post('/api/phidata', auth.isAuthenticated, phiDataController.phiDataCreate);
	app.put('/api/phidata/:id', auth.isAuthenticated, phiDataController.phiDataUpdate);
	app.del('/api/phidata/:id', auth.isAuthenticated, phiDataController.phiDataDelete);
	app.get('/api/products-main', auth.isAuthenticated, phiDataController.mainInfoAboutProducts);
	

	app.get('/api/phidata/by-email/:email', auth.isAuthenticated, phiDataController.phiFindByEmail);
	
	// generate endpoints for sub-schemas in phi.
	dynamicRoutesService.addDynamicRoutes(phiModel.models.phi, PhiModel, app);
};
