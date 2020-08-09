"use strict";

const settingsController = require("../controllers/settings")
, jwt = require("jsonwebtoken")
, auth = require("./auth");


module.exports = app => {
	// Settings endpoints
	app.get('/api/settings', auth.isAuthenticated, settingsController.settingsList);
	app.get('/api/settings/:id', auth.isAuthenticated, settingsController.settingsRead);
	app.post('/api/settings', auth.isAuthenticated, settingsController.settingsCreate);
	app.put('/api/settings/:id', auth.isAuthenticated, settingsController.settingsUpdate);
	app.del('/api/settings/:id', auth.isAuthenticated, settingsController.settingsDelete);
};
