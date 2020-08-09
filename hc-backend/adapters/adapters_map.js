var patientAdapter = require('./patient_to_pii');

// map format: { resourceName: adapter }
module.exports = {
    Patient: patientAdapter
};