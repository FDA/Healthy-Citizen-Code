/**
 * See backend/model/helpers/validators.js for details
 */

module.exports = function (vutil) {
    var _ = require('lodash');

    var m = {
        "void": function (modelName, lodashPath, appModelPart, handlerSpec, cb) {
            cb();
        }
    }
    return m;
};