const Hospital = require('../models/hospital');
/**
 * GET /api/hospitals
 */
exports.read = (req, res) => {
    var promise = Hospital.find({}).exec();
    promise
        .then(function(hospitals){
            res.json({items: hospitals, success: true});
        })
        .catch(function(err){
            res.json(500, {
                code: 500,
                error: err
            })
        });
};
