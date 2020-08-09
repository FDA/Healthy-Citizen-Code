const mkFhir = require('fhir.js');


module.exports.read = function (searchObj, url, errorParam) {
    return new Promise(
        function (resolve, reject) {
            let client = mkFhir({
                baseUrl: url
            });
            try {
                client
                    .search(searchObj)
                    .then(function (response) {
                        return resolve(response.data);
                    })
                    .catch(function (response) {
                        if (response.status) {
                            console.log('Error in ' + errorParam + ' client', response.status);
                        }
                        if (response.message) {
                            console.log('Error ' + errorParam + ' client', response.message);
                        }
                        return reject(response);
                    });
            } catch (e) {
                console.log("Exception in " + errorParam + "client controller ", e);
                reject(e);
            }
        }
    );
};

module.exports.create = function (entry, url, errorParam) {
    return new Promise(
        function (resolve, reject) {
            let client = mkFhir({
                baseUrl: url
            });
            try {
                console.log(client);
                client
                    .create(entry)
                    .then(
                        function (entry) {
                            resolve(entry);
                        })
                    .catch(
                        function (error) {
                            console.error("Error in create " + errorParam + "fhir request: ", error);
                            reject(error);
                        })
            
            } catch (e) {
                console.log("Exception in " + errorParam + "client controller ", e);
                reject(e);
            }
            
        }
    );
};