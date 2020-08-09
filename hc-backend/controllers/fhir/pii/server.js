const PiiData = require('../../../models/pii_data');
const patientToPiiAdapter = require('./../../../adapters/patient_to_pii');

module.exports.read = (req, res) => {
    var email = req.query.email;
    PiiData
        .find({email: email}).exec()
        .then(function (pii) {
            // TODO if find some patient with one email?
            var patient = patientToPiiAdapter.toFHIR(pii[0]);
            res.json(patient);
        })
        .catch(function (errors) {
            res.send({success: false, error: errors, statusCode: 200});
        })
};


module.exports.create = (req, res) => {
    console.log('Remote server create pii data: ', req.body)
    console.log('Imitate create new pii')
    res.send(req.body);
};