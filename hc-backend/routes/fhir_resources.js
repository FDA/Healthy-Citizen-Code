"use strict";

const auth = require("./auth");
// remote server controllers
const fhirPiiServerController = require('./../controllers/fhir/pii/server');
const fhirPhiServerController = require('./../controllers/fhir/phi/server');
const fhirSettingsServerController = require('./../controllers/fhir/settings/server');
const fhirMedicationServerController = require('./../controllers/fhir/medication/server');
const encounterController = require('./../controllers/fhir/phi/server');

module.exports = app => {
    // NOT FHIR Resources
    app.get('/pii', fhirPiiServerController.read);
    app.post('/pii', fhirPiiServerController.create);
    
    app.get('/phi', fhirPhiServerController.read);
    app.post('/phi', fhirPhiServerController.create);
    
    app.get('/settings', fhirSettingsServerController.read);
    app.post('/settings', fhirSettingsServerController.create);
    
    app.get('/medications', fhirMedicationServerController.read);
    app.post('/medications', fhirMedicationServerController.create);

    //FHIR resources
    app.get('/Encounter', encounterController.read);
    app.get('/Patient', fhirPiiServerController.read);
};
