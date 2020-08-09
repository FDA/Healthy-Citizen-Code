/**
 * Validators for various fields in the app model
 * See metaschema for details
 * WARNING: avoid using ES6 in this file as it will be used both on back and frontend.
 *
 * Each validators accepts variable number or arguments:
 * @param this is binded to the actual data to validate
 * @param lodashPath path in lodash format to the element of the data being validated
 * @param appModelPart is the part of the app model defining the elment being verified
 * @param handler spec is the specification containing the validator specification and containing the following fields:
 *  validator - the name of the validator (matches the function name
 *  arguments - the argumetns of the validator (always in associative, not positional)
 *  errorMessages - error messages suggested for returning in the case of error. It may have the following placeholders:
 *    $val - replaced with the value being validated (don't name the arguments "val")
 *    $<variableName> - replaced with the value of the corresponding named argument
 *    #<lodashPath> - if argument is a data attribute name then replaced with the value of that attribute according to this loadsh path and attribute type, otherwise just replaced with value
 *    @<lodashPath> - if argument is a data attribute name then replaced with the name of that attribute according to this loadsh path and attribute type, otherwise just replaced with value
 * The model may contain validators specified as an array in one of the two formats (you can mix them in one array):
 * Extended format:
 *  "validate": [{
 *      "validator": "notEqual",
 *      "arguments": {
 *          "value": "2017-01-01T00:00:00",
 *          "value2": "$otherFieldInRecord"
 *      },
 *      "errorMessages": {
 *          "default": "The date should not be equal to Jan 1st, 2017 midnight"
 *      }
 *  }]
 *  Simplefied format:
 *  ["min(6)", "max(25)", "notEqual(9)"]
 *  Simplified format is always extended before passing to validators using validatorShortcuts file explaining how to do this mapping
 *  NOTE: you have to have lodash for this to work. Lodash is available for both web browser and ReactNative
 */

module.exports = function (vutil) {
    var _ = require('lodash');
    var fs = require('fs');
    var request = require('request'); // https://www.npmjs.com/package/request

    var m = {
        "minLength": function (modelName, lodashPath, appModelPart, handlerSpec, cb) {
            var val = vutil.getValue(this, appModelPart, lodashPath);
            var length = vutil.getArgumentValue(handlerSpec.arguments, 'length', this, lodashPath, appModelPart);
            //console.log(`>>> minLength val: ${val}, length: ${length}, lodashPath: ${lodashPath}, handlerSpec: ${JSON.stringify(handlerSpec)}`);
            if (val && length && (val.length < length)) {
                cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
            } else {
                cb();
            }
        },
        "maxLength": function (modelName, lodashPath, appModelPart, handlerSpec, cb) {
            var val = vutil.getValue(this, appModelPart, lodashPath);
            var length = vutil.getArgumentValue(handlerSpec.arguments, 'length', this, lodashPath, appModelPart);
            //console.log(`>>> maxLength val: ${val}, length: ${length}, lodashPath: ${lodashPath}, handlerSpec: ${JSON.stringify(handlerSpec)}`);
            if (val && length && ( val.length > length)) {
                cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
            } else {
                cb();
            }
        },
        "notEqual": function (modelName, lodashPath, appModelPart, handlerSpec, cb) {
            var val = vutil.getValue(this, appModelPart, lodashPath);
            var value = vutil.getArgumentValue(handlerSpec.arguments, 'value', this, lodashPath, appModelPart);
            //console.log(`>>> notEqual val: ${val}, value: ${value}, lodashPath: ${lodashPath}, handlerSpec: ${JSON.stringify(handlerSpec)}`);
            if (val && value && (val == value)) {
                cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
            } else {
                cb();
            }
        },
        "equal": function (modelName, lodashPath, appModelPart, handlerSpec, cb) {
            var val = vutil.getValue(this, appModelPart, lodashPath);
            var value = vutil.getArgumentValue(handlerSpec.arguments, 'value', this, lodashPath, appModelPart);
            //console.log(`>>> equal val: ${val}, value: ${value}, lodashPath: ${lodashPath}, handlerSpec: ${JSON.stringify(handlerSpec)}`);
            if (val && value && (val == value)) {
                cb();
            } else {
                cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
            }
        },
        "regex": function (modelName, lodashPath, appModelPart, handlerSpec, cb) {
            var val = vutil.getValue(this, appModelPart, lodashPath, true);
            //console.log(`>>> regex val1: ${val}, tval: ${typeof val}, lodashPath: ${lodashPath}, data: ${JSON.stringify(this)}`);
            var regex = vutil.getArgumentValue(handlerSpec.arguments, 'regex', this, lodashPath, appModelPart);
            var regexOptions = vutil.getArgumentValue(handlerSpec.arguments, 'regexOptions', this, lodashPath, appModelPart);
            //console.log(`>>> regex val: ${val}, tval: ${typeof val}, regex: ${regex}, regexOptions: ${regexOptions}, lodashPath: ${lodashPath}, handlerSpec: ${JSON.stringify(handlerSpec)}`);
            if (val && regex && regexOptions && !val.match(new RegExp(regex, regexOptions))) {
                cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
            } else {
                cb();
            }
        },
        "notInFuture": function (modelName, lodashPath, appModelPart, handlerSpec, cb) { // TODO: replace with max(date) and $now/@now?
            var val = vutil.getValue(this, appModelPart, lodashPath);
            var limit = vutil.getDatePartValue(new Date());
            //console.log(`>>> notInFuture val: ${val}, limit: ${limit}, lodashPath: ${lodashPath}, handlerSpec: ${JSON.stringify(handlerSpec)}`);
            if (val && ( val > limit )) {
                cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
            } else {
                cb();
            }
        },
        "min": function (modelName, lodashPath, appModelPart, handlerSpec, cb) {
            var val = vutil.getValue(this, appModelPart, lodashPath);
            var limit = vutil.getArgumentValue(handlerSpec.arguments, 'limit', this, lodashPath, appModelPart);
            //console.log(`>>> min val: ${val}, tval: ${typeof val}, limit: ${limit}, tlimit: ${typeof limit}, test: ${val >= limit}, lodashPath: ${lodashPath}, appModelPart: ${JSON.stringify(appModelPart)}, handlerSpec: ${JSON.stringify(handlerSpec)}`);
            if (val && limit && ( val < limit )) {
                cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
            } else {
                cb();
            }
        },
        "max": function (modelName, lodashPath, appModelPart, handlerSpec, cb) {
            var val = vutil.getValue(this, appModelPart, lodashPath);
            var limit = vutil.getArgumentValue(handlerSpec.arguments, 'limit', this, lodashPath, appModelPart);
            //console.log(`>>> max val: ${val}, limit: ${limit}, test: ${val >= limit}, lodashPath: ${lodashPath}, handlerSpec: ${JSON.stringify(handlerSpec)}`);
            if (val && limit && (val > limit)) {
                cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
            } else {
                cb();
            }
        },
        "imperialHeightRange": function (modelName, lodashPath, appModelPart, handlerSpec, cb) {
            var val = _.get(this, lodashPath);
            var limit = _.get(handlerSpec, 'arguments');
            //console.log(`>>> heightRange val: ${val}, limit: ${limit}, test: ${val >= limit}, lodashPath: ${lodashPath}, handlerSpec: ${JSON.stringify(handlerSpec)}`);
            if (Array.isArray(val) && Array.isArray(limit.from) && Array.isArray(limit.to) && val.length === 2 && limit.from.length === 2 && limit.to.length === 2) { // TODO: also check if these are integers?
                var valInIn = val[0] * 12 + val[1];
                var fromInIn = limit.from[0] * 12 + limit.from[1];
                var toInIn = limit.to[0] * 12 + limit.to[1];
                if (valInIn >= fromInIn && valInIn <= toInIn) {
                    cb();
                } else {
                    cb(vutil.replaceErrorTemplatePlaceholders(modelName, handlerSpec, val, this, lodashPath, appModelPart));
                }
            } else {
                cb();
            }
        },
        "dynamicListValue": function (modelName, lodashPath, appModelPart, handlerSpec, cb) {
            var url = appModelHelpers.Lists[appModelPart.list];
            var val = _.get(this, lodashPath);
            if (url.startsWith("/")) {
                url = process.env.APP_URL + url;
            }
            console.log("URL:", url);
            request.get(url, function (err, res, body) {
                if (err) {
                    console.log("ERR:", err);
                    console.log("RES:", res);
                    cb("Error validating dynamic list selection: " + err);
                } else {
                    var list = JSON.parse(body).data;
                    var allowedValues = _.keys(list);
                    if (_.isArray(val) && ( _.difference(val, allowedValues).length === 0 ) || _.includes(allowedValues, val)) {
                        cb();
                    } else {
                        cb("Incorrect dynamic list value, must be one of " + _.keys(list).join(", "));
                    }
                }
            });
        }
    };
    return m;
};