const Settings = require('../../../models/settings');

module.exports.read = (req, res) => {
    var _id = req.query._id;
    Settings
        .findById(_id).exec()
        .then(function (settings) {
            res.send({data: settings});
        })
        .catch(function (errors) {
            res.send({success: false, error: errors, statusCode: 200});
        })
};

module.exports.create = (req, res) => {
    console.log('Remote server create settings data: ', req.body);
    console.log('Imitate create new settings');
    res.send(req.body);
};