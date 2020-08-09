const PhiData = require('../../../models/phi_data')
    , encountersToPhiAdapter = require('./../../../adapters/phi_and_encounter')
    , _ = require('lodash');

module.exports.read = (req, res) => {
    var email = req.query.email;
    console.log(email)
    PhiData
        .find({email: email}).exec()
        .then(function (phi) {
            console.log(phi)
            phi = phi[0];
            var encounters = [];
            _.each(phi.encounters, function (encounter) {
                encounters.push(encountersToPhiAdapter.toFHIR(encounter));
            });
            console.log('SEND', encounters)
            res.send({status:200, resource: encounters});
        })
        .catch(function (errors) {
            console.log('SEND', errors)
            res.send({success: false, error: errors, status: 300});
        })
};

module.exports.create = (req, res) => {
    console.log('Remote server create phi data: ', req.body);
    console.log('Imitate create new phi');
    res.send(req.body);
};