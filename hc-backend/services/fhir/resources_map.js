const patientService = require('./patient_resource_service')
    , encounterService = require('./encounters_resource_service')
    , procedureService = require('./procedure_resource_service')
    , diagnosticReportService = require('./diagnostic_reports_resource_service');

module.exports = {
    "Patient": patientService,
    "Encounter": encounterService, // need refactoring
    "Procedure": procedureService,
    "DiagnosticReport": diagnosticReportService
};