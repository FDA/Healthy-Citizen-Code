"use strict";

const auth = require("./auth");
const hospitalsController = require('./../controllers/hospitals');
const syncController = require('./../controllers/sync');

module.exports = app => {
    
    // endpoint for get all hospitals, required for front-end hospital form
    app.get('/api/hospitals', auth.isAuthenticated, hospitalsController.read);
    
    // synchronization there
    app.post('/api/sync', auth.isAuthenticated, syncController.createUserSync);
};
