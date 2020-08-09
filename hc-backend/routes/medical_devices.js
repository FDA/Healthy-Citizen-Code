"use strict";

const medicalDevicesController = require("../controllers/medical_devices_controller")
    , auth = require("./auth");


module.exports = app => {
    // Medical devices endpoints
    app.get('/api/medicalDevices', auth.isAuthenticated, medicalDevicesController.medicalDevicesList);
    app.get('/api/medicalDevices/:id', auth.isAuthenticated, medicalDevicesController.medicalDevicesRead);
    app.post('/api/medicalDevices', auth.isAuthenticated, medicalDevicesController.medicalDevicesCreate);
    app.put('/api/medicalDevices/:id', auth.isAuthenticated, medicalDevicesController.medicalDevicesUpdate);
    app.del('/api/medicalDevices/:id', auth.isAuthenticated, medicalDevicesController.medicalDevicesDelete);
};
