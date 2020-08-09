const config = require('config');
const fhirClient = require('./../fhir_client_lib_facade');
const url = config.get("hospitalServerUrl");

// Send GET to remote server
module.exports.read = (id) => {
    const searchObj = {type: 'settings', query: {'_id': id}};
    return fhirClient.read(searchObj, url, "Settings")
};

module.exports.create = (obj) => {
    const entry = {
        type: 'settings',
        data: obj
    };
    return fhirClient.create(entry, url, 'Settings')
};