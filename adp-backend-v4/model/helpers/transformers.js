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
                let totalInches = Math.round( val / 2.54 );
                let inches = totalInches % 12;
                let feet = (totalInches - inches) / 12;
                _.set(this, path, [feet, inches]);
            }
            next();
        },
        // TODO: write tests for imperialWeightWithOz
        "weightImperialWithOzToMetric": function (path, appModelPart, next) {
            let val = _.get(this, path);
            if (val && Array.isArray(val) && val.length > 1) {
                let newVal = Math.round(val[0] * 453.59237 + val[1] * 28.349523125);
                _.set(this, path, isNaN(newVal) ? 0 : newVal);
            }
            next();
        },
        "weightMetricToImperialWithOz": function (path, appModelPart, next) {
            let val = _.get(this, path);
            if (val) {
                let totalOzs = Math.round( val / 28.349523125 );
                let ozs = totalOzs % 16;
                let lbs = (totalOzs - ozs) / 16;
                _.set(this, path, [lbs, ozs]);
            }
            next();
        },
        "weightImperialToMetric": function (path, appModelPart, next) {
            let val = _.get(this, path);
            if (val) {
                _.set(this, path, val * 1000 / 2.2046226218); // note: now storing in grams
            }
            next();
        },
        "weightMetricToImperial": function (path, appModelPart, next) {
            let val = _.get(this, path);
            if (val) {
                _.set(this, path, Math.round(val * 2.20462 / 1000)); // note: now storing in grams
            }
            next();
        },
        "addLookupDetails": function (path, appModelPart, next) {
            // TODO: bulletproof this method in case if lookup table record disappears, add validations to the schema
            log.trace(`addLookupDetails: ${path} ${JSON.stringify(appModelPart)}`);
            let model;
            try {
                model = mongoose.connection.model(appModelPart.lookup.table);
            } catch(e) {
                // do nothing
            }
            // TODO: See ADP-217. This is not the most elegant solution, but it should be rewritten when we better know what we need
            // from referring subschemas in lookups. This may also require refactoring the transformers (like getting rid of "this")
            if(model) {
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
            } else {
                // TODO: Using label as sent from the client is a security risk. Fix it later
                next();
            }
        }
    };
    return m;
};