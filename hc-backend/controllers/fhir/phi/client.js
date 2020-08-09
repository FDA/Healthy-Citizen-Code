const fhirClient = require('./../fhir_client_lib_facade')

    , log4js = require('log4js')
    , logger = log4js.getLogger()
    , syncConfig = require('./../../../config/sync_config.json')
    , defaultUrl = syncConfig.defaultHospitalServerUrl
    , defaultPatientId = syncConfig.defaultPatientId;

const getQueryByStrategy = {
    "localTest": (options) => {
        return {email: options}
    },
    "liveFhirFakePatientFindByPatientId": (options) => {
        let patientId = options && options.patientId ? options.patientId : defaultPatientId;
        return {
            patient: patientId,
            _format: "json",
            _pretty: "true"
        };
    },
    "liveFhirFakePatientFindByPatient": (options) => {
        let patientId = options && options.patientId ? options.patientId : defaultPatientId;
        let returnedObj = {
            patient:  patientId, // TODO sometimes here "Patient-" + patientId
            _format: "json",
            _pretty: "true"
        };
        if (options._include) {
            returnedObj._include = options._include;
        }
        return returnedObj;
    }
};

// Send GET to remote server
module.exports.read = (url=defaultUrl, resource, strategy, options) => {
    const query = getQueryByStrategy[strategy](options);
    return new Promise(function (resolve, reject) {
        const searchObj = {type: resource, query: query};
        fhirClient.read(searchObj, url, resource + " " + strategy)
            .then(function (result) {
                return resolve(result);
            })
            .catch(function (error) {
                logger.log('Error in fhir client', error);
                resolve(error);
            })
    })
};

module.exports.create = (obj, url=defaultUrl) => {
    const entry = {
        type: 'phi',
        data: obj
    };
    return fhirClient.create(entry, url, 'Phi')
};