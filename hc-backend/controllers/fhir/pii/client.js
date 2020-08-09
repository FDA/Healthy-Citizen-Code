const config = require('config');
const fhirClient = require('./../fhir_client_lib_facade');
const defaultUrl = config.get("hospitalServerUrl");
const log4js = require('log4js');
const logger = log4js.getLogger();

// Send GET to remote server
module.exports.read = (email, url=defaultUrl) => {
    return new Promise(function (resolve, reject) {
        const searchObj = {type: 'Patient', query: {'email': email}};
        fhirClient.read(searchObj, url, "Pii")
            .then(function (result) {
                return resolve(result)
            })
            .catch(function (error) {
                logger.log('error in fhir client', result)
                resolve(error)
            })
    })
};

module.exports.create = (obj) => {
    const entry = {
        type: 'pii',
        data: obj
    };
    return fhirClient.create(entry, url, 'Pii')
};