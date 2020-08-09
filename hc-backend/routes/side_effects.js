"use strict";

const sideEffectsController = require("../controllers/side_effects_controller")
    , auth = require("./auth");


module.exports = app => {
    // Side effects endpoints
    app.get('/api/side-effects', auth.isAuthenticated, sideEffectsController.sideEffectsList);
    app.get('/api/side-effects/:id', auth.isAuthenticated, sideEffectsController.sideEffectsRead);
    app.post('/api/side-effects', auth.isAuthenticated, sideEffectsController.sideEffectsCreate);
    app.put('/api/side-effects/:id', auth.isAuthenticated, sideEffectsController.sideEffectsUpdate);
    app.del('/api/side-effects/:id', auth.isAuthenticated, sideEffectsController.sideEffectsDelete);
};
