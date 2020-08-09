/**
 * Utility functions used in various validators
 * WARNING: avoid using ES6 in this file as it will be used both on back and frontend.
 */

module.exports = function (vutil) {
    var _ = require('lodash');

    var m = {
        /**
         * Extracts "templateName" error template from the validator specification "spec"
         * and returns a string with all placeholders replaced (see above)
         * @param modelName - model name, e.g. phii, phi etc
         * @param spec - validator extended specification
         * @param val - the value being checked
         * @param data - all data from the current record (e.g. pii or phi record)
         * @param lodashDataPath - lodash path to the data being validated
         * @param appModelPart - the application model part describing the element being validated
         * @param templateName - (optional) the name of the errorTemplate. Template called 'Date' (if available) will be used for values of type 'Date' and so on. Template called 'default' will be used by default.
         * @returns {string|XML}
         */
        replaceErrorTemplatePlaceholders: function (modelName, spec, val, data, lodashDataPath, appModelPart, templateName) {
            if (!templateName) {
                if (appModelPart && 'string' === typeof appModelPart.type) {
                    var type = appModelPart.type.toLowerCase();
                    if (spec.errorMessages[type]) {
                        templateName = type;
                    }
                }
            }
            if (!spec.errorMessages[templateName]) {
                templateName = "default";
            }
            //console.log(`REPLACE: val: ${val}, spec: ${JSON.stringify(spec)} data: ${data}`);
            return spec.errorMessages[templateName]
                .replace(/\$val/, 'Date' === appModelPart.type ? m.getDatePartString( val ) : val )
                .replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, function (match, p1) {
                    return _.get(spec.arguments, p1, "$" + p1);
                })
                .replace(/#([a-zA-Z_][a-zA-Z0-9_]*)/g, function (match, p1) {
                    var argument = _.get(spec.arguments, p1, '#' + p1);
                    //console.log(`REPLACE1: argument: ${argument}`);
                    if (argument[0] === '$') {
                        //var pos = lodashDataPath.lastIndexOf('.');
                        //var pLodashDataPath = pos > -1 ? lodashDataPath.substr(0, pos + 1) : '';
                        //console.log(`REPLACE2: argument: ${argument}, pLodashDataPath: ${pLodashDataPath}, pos: ${pos}`);
                        //var pLodashDataPath = lodashDataPath.replace(/\.[^.]*$/, '.');
                        var v = _.get(data, m.levelUp(lodashDataPath) + argument.substr(1), "$" + argument);
                        return 'Date' === appModelPart.type ? m.getDatePartString( v ) : v; // TODO: UGLY, refactor this
                    } else {
                        return 'Date' === appModelPart.type ? m.getDatePartString( new Date( argument ).getTime() ) : argument;
                    }
                })
                .replace(/@([a-zA-Z_][a-zA-Z0-9_]*)/g, function (match, p1) {
                    var argument = _.get(spec.arguments, p1, '@' + p1);
                    if (argument[0] === '$') {
                        //var pos = lodashDataPath.lastIndexOf('.');
                        //var pLodashDataPath = pos > -1 ? lodashDataPath.substr(0, pos + 1) : '';
                        //var pLodashDataPath = lodashDataPath.replace(/\.[^.]*$/, '.');
                        var modelPath = modelName + '.fields.' + m.levelUp(lodashDataPath) + argument.substr(1);
                        modelPath = modelPath.replace(/\.\d+\./, '.fields.'); // TODO: this only works for arrays and subschemas, but not objects, send full model path here
                        //console.log(`REPLACE2: modelPath: ${modelPath}, argument: ${argument}, pLodashDataPath: ${pLodashDataPath}, pos: ${pos}, appModel: ${appModel}`);
                        return _.get(appModel.models, modelPath + ".fullName", argument);
                    } else {
                        return 'Date' === appModelPart.type ? m.getDatePartString( new Date( argument ).getTime() ) : argument;
                    }
                    //return _.get(appModelPart, "fullName", argument);
                })
                .replace(/@@/g, "@")
                .replace(/\$\$/g, "$");
        },

        /**
         * Casts string representation into value of appropriate type
         * Necessary because data always comes as strings
         * @param val
         * @param appModelPart
         * @returns {*}
         */
        getCastedValue: function (val, appModelPart) {
            if (val && appModelPart.type === "Date") {
                val = m.getDatePartValue(new Date(val));
            } else if (val && appModelPart.type === "Number") {
                val = Number(val);
            } else if (val && appModelPart.type === "Boolean") {
                val = _.includes(['true', 'yes'], val.toLower());
            }
            return val;
        },
        levelUp: function (str) {
            var pos = str.lastIndexOf('.');
            return pos > -1 ? str.substr(0, pos + 1) : '';
        },

        getArgumentValue: function (spec, lodashSpecPath, data, lodashDataPath, appModelPart, noCasting) {
            var val = _.get(spec, lodashSpecPath);
            //console.log(`Val0: val: ${val}, lodashSpecPath: ${lodashSpecPath}, data: ${JSON.stringify(data)}, type: ${typeof val}`);
            if ('string' === typeof val) {
                val = val.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, function (match, p1) {
                    //console.log(`Val1: lodashDataPath: ${lodashDataPath}, pLodashDataPath: ${pLodashDataPath}, ret: ${_.get(data, pLodashDataPath + p1, "$" + p1)}`);
                    return _.get(data, m.levelUp(lodashDataPath) + p1, "$" + p1);
                });
                if (val && !noCasting) {
                    val = m.getCastedValue(val, appModelPart);
                }
            }
            //console.log( `lodashSpecPath: ${lodashSpecPath}, type: ${appModelPart.type}, val: ${val}` );
            return val;
        },

        /**
         * Extracts the value from the validator argument "str" according to its type
         * @param data
         * @param appModelPart
         * @param lodashPath
         * @param noCasting if true then not attempts to convert to appModelPart.type will be made
         */
        getValue: function (data, appModelPart, lodashPath, noCasting) {
            var val = _.get(data, lodashPath);
            if (!noCasting) {
                val = m.getCastedValue(val, appModelPart);
            }
            //console.log( `Val0: val: ${val}, lodashPath: ${lodashPath}, data: ${JSON.stringify(data)}, type: ${typeof val}` );
            return val;
        },
        /**
         * removes time part from datetime and returns only date part for clean date comparison
         * TODO: improve this method to take timezone into consideration, currently works only when server and clients are in the same TZ
         * @param date
         */
        getDatePartValue: function (date) {
            var d = new Date(date);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        },
        /**
         * Returns human-readable date in US format mm/dd/yyyy
         * @param date
         * @returns {string}
         */
        getDatePartString: function (date) {
            var d = new Date(date);
            return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
        }
    };
    return m;
};