const  _ = require('lodash')

    , logger = require('log4js').getLogger()
    , lists = require('./../src/data_model/lists');


module.exports.fromFHIR = function (resource, encounterModel) {
    try {
        let newLabTests = {
            // testId: resource
        };
        return newLabTests;
    }
    catch (error) {
        logger.warn("error " + error + "in encounter adapter in method fromFHIR, with encounter: ", encounter, " This encounter will be ignore.");
        return false
    }
};