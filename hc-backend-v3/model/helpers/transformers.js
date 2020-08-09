/**
 * Transformers to be called by the BACKEND ONLY
 * WARNING: do not use lambda-functions, only function(param) {}, NOT (param) => {}. Lambda functions do not preserve "this"
 * each transformer receives "this" pointing to the document to be altered and 3 parameters:
 * path - string containing path to the element being altered (compatible with lodash _.set and _.get
 * next - callback to be called in the end of transformation
 */

module.exports = function (mongoose) {
    const _ = require('lodash');
    const crypto = require('crypto');
    const async = require('async');
    const log = require('log4js').getLogger('helpers/transformers');
    const ObjectID = require('mongodb').ObjectID;

    const m = {
        "trim": function (path, appModelPart, next) {
            let val = _.get(this, path);
            if (val && 'function' === typeof val.trim) {
                _.set(this, path, val.trim());
            }
            next();
        },
        "heightImperialToMetric": function (path, appModelPart, next) {
            let val = _.get(this, path);
            if (val && Array.isArray(val) && val.length > 1) {
                let newVal = Math.round(val[0] * 30.48 + val[1] * 2.54);
                _.set(this, path, isNaN(newVal) ? 0 : newVal);
            }
            next();
        },
        "heightMetricToImperial": function (path, appModelPart, next) {
            let val = _.get(this, path);
            if (val) {
                let feet = Math.floor(val / 30.48);
                let inches = Math.round(( val - feet * 30.48 ) / 2.54);
                _.set(this, path, [feet, inches]);
            }
            next();
        },
        "weightImperialToMetric": function (path, appModelPart, next) {
            let val = _.get(this, path);
            if (val) {
                _.set(this, path, val / 2.2046226218);
            }
            next();
        },
        "weightMetricToImperial": function (path, appModelPart, next) {
            let val = _.get(this, path);
            if (val) {
                _.set(this, path, Math.round(val * 2.2046226218));
            }
            next();
        },
        "addLookupDetails": function (path, appModelPart, next) {
            // TODO: bulletproof this method in case if lookup table record disappears, add validations to the schema
            log.trace(`addLookupDetails: ${path} ${JSON.stringify(appModelPart)}`);
            let model = mongoose.connection.model(appModelPart.lookup.table);
            let ids = _.get(this, path);
            let addLabel = function (idStr, cb) {
                let id = new ObjectID(idStr);
                model.findOne({[appModelPart.lookup.foreignKey]: id}, {[appModelPart.lookup.label]: 1}, function (err, data) {
                    let val;
                    if (err || !data) {
                        log.error(`Unable to find lookup record for lookup ${JSON.stringify(appModelPart.lookup, null, 4) } ID: ${id}`);
                    } else {
                        val = data[appModelPart.lookup.label];
                    }
                    cb(err, val);
                });
            };

            let newLabel = [];
            let doNext = function () {
                _.set(this, `${path}_label`, _.isArray(newLabel) ? _.uniq(newLabel) : newLabel);
                next();
            };
            if (_.isString(ids)) {
                async.series([
                    (cb) => {
                        addLabel(ids, function (err, val) { // addLabel ruins context
                            if (!err && val) {
                                newLabel = val;
                            }
                            cb();
                        });
                    }
                ], doNext.bind(this));
            } else if (_.isArray(ids)) {
                async.eachSeries(ids, function (id, cb) {
                    addLabel(id, function (err, val) {
                        if (!err && val) {
                            newLabel.push(val);
                        }
                        cb();
                    });
                }, doNext.bind(this)); // async loses context, this is why
            } else {
                log.error(`addLookupDetails expects either string or array, but got ${ids}`);
                next();
            }
        }
    };
    return m;
};