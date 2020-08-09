/**
 * Synthesizers are very similar to transformers but have different semantics and for that reason extracted to a separate file
 * They are only executed on the server side and set value for a field that is not directly based on user input
 */

module.exports = function (mongoose) {
    const _ = require('lodash');
    const crypto = require('crypto');
    const async = require('async');
    const log = require('log4js').getLogger('helpers/transformers');
    const ObjectID = require('mongodb').ObjectID;

    const m = {
        "randomString": function (path, appModelPart, next) {
            let charset = _.get(appModelPart, "synthesize.arguments.charset", "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"); // WARNING: excludes certain letters that look like other characters
            let length = _.get(appModelPart, "synthesize.arguments.length", 8);
            let val = "";
            for (let i = 0; i < length; ++i) {
                val += charset[Math.floor(Math.random() * charset.length)];
            }
            _.set(this, path, val);
            next();
        },
        "now": function (path, appModelPart, next) {
            _.set(this, path, new Date());
            next();
        }
    };
    return m;
};