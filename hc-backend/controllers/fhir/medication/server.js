const Medication = require('../../../models/medication');

module.exports.read = (req, res) => {
    var _id = req.query._id;
    console.log(_id)
    Medication
        .findById(_id).exec()
        .then(function (medication) {
            res.send({data: medication});
        })
        .catch(function (errors) {
            res.send({success: false, error: errors, statusCode: 200});
        })
};

module.exports.create = (req, res) => {
    console.log('Remote server create medications data: ', req.body);
    console.log('Imitate create new medications');
    res.send(req.body);
};