const syncService = require('./../services/sync_service')
    , log4js = require('log4js')
    , logger = log4js.getLogger()
    , errors = require('./../errors/errors');


/**
 * GET /api/pull data about patient from FHIR server
 */
module.exports.createUserSync = function (req, res) {
    const body = req.body;
    const email = req.decoded.email;
    
    // Check params for request,
    if (!email) {
        return res.send(400, {code: 400, message: "Field email can not be empty."})
    }
    if (!body.hospitals) {
        return res.send(400, {code: 400, message: "Field hospitals can not be empty."})
    }
    
    let listOfResources = undefined; // TODO add later resources from req
    
    // Synchronization there
    syncService
        .searchInfoFromHospitals(email, body.hospitals, listOfResources, req.body) // There we send request to remote server for pull data about patient
        .then(function (responseFromHospitals) {
            return syncService.saveResponseFromHospitals(responseFromHospitals); // Save response from remote server to our database
        })
        .then(function (result) {
            if (result === null) {
                return res.send(400, {code: 400, message: "Internal error. Can't sync empty data."}); // Throw error if request unsuccessful
            }
            return res.send({code: 200});
        })
        .catch(function (error) {
            const handledError = errors.errorsHandling(error);
            res.send(handledError.code, handledError.error);
        })
};