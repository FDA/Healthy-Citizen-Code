const generalTestSettings = require('./../tests_params').params.general
    , rp = require('request-promise');

/**
 * Function for pull model.json from backend
 * @return {Promise}
 */
module.exports.getModel = () => {
    return new Promise(function (resolve, reject) {
        const schemaUrl = generalTestSettings.backendUrl + generalTestSettings.schemaPath;
        const options = {
            uri: schemaUrl,
            json: true
        };
        
        rp(options) 
            .then(function (repos) {
                resolve(repos.data);
            })
            .catch(function (err) {
                reject(err);
            });
    });
};