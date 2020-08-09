"use strict";

const alertsController = require("../controllers/alerts")
    , jwt = require("jsonwebtoken")
    , auth = require("./auth");

module.exports = app => {
    // Alerts endpoints
    app.get('/api/alerts', auth.isAuthenticated, alertsController.alertsList);
    app.get('/api/alerts/:id', auth.isAuthenticated, alertsController.alertRead);
    app.post('/api/alerts', auth.isAuthenticated, alertsController.alertCreate);
    app.put('/api/alerts/:id', auth.isAuthenticated, alertsController.alertUpdate);
    app.del('/api/alerts/:id', auth.isAuthenticated, alertsController.alertDelete);
};
