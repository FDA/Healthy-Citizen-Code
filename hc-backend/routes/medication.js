"use strict";

const medicationController = require("../controllers/medication")
, jwt = require("jsonwebtoken")
, auth = require("./auth");

module.exports = app => {
	// Medication endpoints
	app.get('/api/medication', auth.isAuthenticated, medicationController.medicationList);
	app.get('/api/medication/:id', auth.isAuthenticated, medicationController.medicationRead);
	app.post('/api/medication', auth.isAuthenticated, medicationController.medicationCreate);
	app.put('/api/medication/:id', auth.isAuthenticated, medicationController.medicationUpdate);
	app.del('/api/medication/:id', auth.isAuthenticated, medicationController.medicationDelete);
};
