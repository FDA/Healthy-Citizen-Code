/**
 * @module model-util
 * This module provides utilities shared between multiple applications and allows models manipulation for
 * Conceptant applications.
 */
module.exports = function () {

    const log = require('log4js').getLogger('lib/model');
    const mongoose = require("mongoose");
    const fs = require("fs");
    const merge = require("merge");
    const async = require("async");
    const glob = require("glob");
    const moment = require('moment');
    const _ = require('lodash');
    const butil = require('./backend-util')();

    const schemaTransformers = require('./schema-transformers')();
    const Schema = mongoose.Schema;
    const RJSON = require("relaxed-json");

    let m = {};

    /**
     * Contains model's metaschema
     * @type {{}}
     */
    m.metaschema = {};

    /**
     * Maps HC schema master file types to mongoose types
     * @enum {Object}
     */
    m.mongooseTypesMapping = {
        "String": String,
        "Date": Date,
        "Number": Number,
        "Boolean": Boolean,
        "Mixed": mongoose.Schema.Types.Mixed,
        "ObjectID": mongoose.Schema.Types.ObjectId,
        "String[]": [String],
        "Date[]": [Date],
        "Number[]": [Number],
        "Boolean[]": [Boolean],
        "Mixed[]": [mongoose.Schema.Types.Mixed],
        "Object[]": [mongoose.Schema.Types.Mixed],
        "ObjectID[]": [mongoose.Schema.Types.ObjectId],
        // the following fields will only contain file names
        "Image": [mongoose.Schema.Types.Mixed],
        "Video": [mongoose.Schema.Types.Mixed],
        "Audio": [mongoose.Schema.Types.Mixed],
        "File": [mongoose.Schema.Types.Mixed],
        "Image[]": [mongoose.Schema.Types.Mixed],
        "Video[]": [mongoose.Schema.Types.Mixed],
        "Audio[]": [mongoose.Schema.Types.Mixed],
        "File[]": [mongoose.Schema.Types.Mixed],
        "Location": [Number],
        "Barcode": String,
    };

    /**
     * Combines all files in a directory into a single JSON representing the HC master schema
     * @param path path to the directory containing parts of the schema
     * @returns {Object} JSON containing the master model
     */
    m.getCombinedModel = (appModelPath, backendModelPath) => {
        const files = _.concat(glob.sync(`${backendModelPath}/**/*.json`), glob.sync(appModelPath + "**/*.json"));
        let model = {};
        files.forEach(function (file) {
            log.trace("Merging", file);
            let content = "";
            let parsedContent;
            try {
                content = fs.readFileSync(file, 'utf8');
                parsedContent = RJSON.parse(content);
            } catch (e) {
                throw new Error(`Unable to parse model: "${e}" in file "${file}". Source: \n${content}`);
            }
            model = merge.recursive(true, model, parsedContent);
        });
        m.metaschema = model.metaschema;
        return model;
    };

    // Generating the mongoose model -------------------------------------------------------------

    /**
     * Gets complete mongoose-compatible schema definition based on JSON application model
     * @param {string} name name of the conceptant JSON element to generate mongoose schema definition for
     * @param {Object} obj - conceptant JSON element top generate mongoose schema for
     * @param {Object} mongooseModel mongoose quivalent of the model will go into this parameter
     */
    m.getMongooseSchemaDefinition = (name, obj, mongooseModel) => {
        /**
         * Sets one mongoose model attribute based on the parameters
         * @param obj app JSON model describing the attribute
         * @param objAttr app JSON attribute name
         * @param model mongoose model JSON
         * @param modelAttr mongoose model JSON attribtue name
         * @param useDefault if true then set the attribute to default value defined in schema.js
         */
        let setMongooseModelAttribute = function (obj, objAttr, model, modelAttr, useDefault) {
            if (obj[objAttr]) {
                model[modelAttr] = obj[objAttr];
            } else if (useDefault) {
                model[modelAttr] = m.metaschema[modelAttr].default;
            }
        };
        // TODO: implement a way to prevent this for certain collections
        let addCUDFields = (obj) => {
            if (!obj.fields) {
                obj.fields = {};
            }
            if (!obj.fields.created) {
                obj.fields.created = {
                    "type": "Date",
                    "visible": false,
                    "generated": true,
                    "fullName": "Updated",
                    "description": "Date when the record was last created"
                };
            }
            if (!obj.fields.updated) {
                obj.fields.updated = {
                    "type": "Date",
                    "visible": false,
                    "generated": true,
                    "fullName": "Updated",
                    "description": "Date when the record was last updated"
                };
            }
            if (!obj.fields.deleted) {
                obj.fields.deleted = {
                    "type": "Date",
                    "visible": false,
                    "generated": true,
                    "fullName": "Deleted",
                    "description": "Date when the record was deleted"
                };
            }
        };
        if (obj.type == "Group") {
            // do nothing
        } else if (obj.type == "Schema") {
            addCUDFields(obj);
            obj.fields["generatorBatchNumber"] = {
                "type": "String",
                "visible": false,
                //"comment": "Do not set this to anything for real records, they may get wiped out as autogenerated otherwise", // this will be eliminated by backed
                "generated": true,
                "fullName": "Generator Batch Number",
                "description": "Set to the ID of generator batch for synthetic records"
            };
            for (let field in obj.fields) {
                if (obj.fields.hasOwnProperty(field)) {
                    m.getMongooseSchemaDefinition(field, obj.fields[field], mongooseModel);
                }
            }
        } else if (obj.type == "Subschema") {
            // TODO: Move this into validateModelPart
            addCUDFields(obj);
            obj.fields["_id"] = {
                "type": "ObjectID",
                "visible": false,
                //"comment": "This is internal fields identifying each element of subschema", // this will be eliminated by backend
                "generated": true,
                "fullName": "Subschema element id",
                "description": "Subschema element id",
                "generatorSpecification": ["_id()"] // need to specify here because of the order of operations
            };
            mongooseModel[name] = [{}];
            for (let field in obj.fields) {
                if (obj.fields.hasOwnProperty(field)) {
                    m.getMongooseSchemaDefinition(field, obj.fields[field], mongooseModel[name][0]);
                }
            }
        } else if (obj.type == "Object") {
            mongooseModel[name] = {};
            for (let field in obj.fields) {
                if (obj.fields.hasOwnProperty(field)) {
                    m.getMongooseSchemaDefinition(field, obj.fields[field], mongooseModel[name]);
                }
            }
        } else if (obj.type == "Array") {
            mongooseModel[name] = [{}];
            for (let field in obj.fields) {
                if (obj.fields.hasOwnProperty(field)) {
                    m.getMongooseSchemaDefinition(field, obj.fields[field], mongooseModel[name][0]);
                }
            }
            // TODO: currently lookups are only supported for individual ObjectID. Add support of any types of fields and arrays of fields in the future
        } else if (obj.type == "ObjectID") {
            mongooseModel[name] = {type: Schema.Types.ObjectId};
        } else if (obj.type == "Location") {
            mongooseModel[name] = {type: [Number], index: '2d'};
            setMongooseModelAttribute(obj, 'index', mongooseModel[name], 'index', true);
            if (obj.hasOwnProperty('lookup') && obj["lookup"].hasOwnProperty("table")) {
                //mongooseModel[name]["ref"] = obj.lookup["table"];
            }
        } else {
            mongooseModel[name] = {
                type: m.mongooseTypesMapping[obj.type]
            };
            setMongooseModelAttribute(obj, 'unique', mongooseModel[name], 'unique', false);
            setMongooseModelAttribute(obj, 'index', mongooseModel[name], 'index', false);
            // TODO: min, max
            // TODO: ref: http://stackoverflow.com/questions/26008555/foreign-key-mongoose ?
            // TODO:  min/maxLength, validator, validatorF, default, defaultF, listUrl from definition?
            if (obj.hasOwnProperty('list')) {
                if (appModelHelpers.Lists[obj.list]) {
                    if (_.isString(appModelHelpers.Lists[obj.list])) {
                        // do nothing, will need to validate value in the code since it's 100% dynamic
                    } else {
                        //mongooseModel[name].enum = Object.keys(appModelHelpers.Lists[obj.list]); // Mongoose validations do not allow creating records with empty enum values, which is what we need for optional fields
                    }
                } else if (_.isObject(obj.list)) { // Array is also an object
                    //mongooseModel[name].enum = Object.keys(obj.list); // Mongoose validations do not allow creating records with empty enum values, which is what we need for optional fields
                } else {
                    throw new Error(`List "${obj.list}" in attribute "${name}" is not defined in lists and is not valid list. Please update helpers/lists.js or the app model. Attribute Specification: ${JSON.stringify(obj, null, 2)}`);
                }
            }
        }
    };

    /**
     * Validates that the app model matches metaschema
     * Also augments the model with defaults for subtypes, lookups etc
     * @returns {Array} array containing list of problems in the model
     */
    // TODO: rewrite using m.traverseAppModel ?
    // TODO: split this method into multiple functions, it's getting big
    m.validateAndCleanupAppModel = () => {
        let errors = [];
        let allowedAttributes = _.keys(appModel.metaschema);

        // These validators are called for specific part of the model (vs all attributes of the part, see below) -----

        /**
         * Merges the defaults set in the typeDefaults and subtypeDefaults into the appModel part
         * @param part
         * @param path
         */
        let mergeTypeDefaults = (part, path) => {
            part.type = _.get(part, 'type', appModel.metaschema.type.default);
            let defaults = _.get(appModel, `typeDefaults.fields.${part.type}`, {});
            let doNotOverwrite = (objValue, srcValue) => { // objValue is the target value
                if (_.isArray(objValue) && _.isArray(srcValue)) {
                    return srcValue.concat(objValue);
                } else if ('undefined' == typeof objValue) {
                    return _.cloneDeep(srcValue);
                } else if (null == srcValue || objValue == null) {
                    return null;
                } else {
                    return _.mergeWith(objValue, srcValue, doNotOverwrite);
                    //return objValue;
                }
            };
            _.mergeWith(part, defaults, doNotOverwrite);
            if (part.hasOwnProperty('subtype')) {
                let defaults = _.get(appModel, `subtypeDefaults.fields.${part.subtype}`, {});
                _.mergeWith(part, defaults, doNotOverwrite);
                //_.merge(part, defaults);
            }
        };

        /**
         * Converts transformer definition consisting of just one string into one-element array
         * @param part
         * @param path
         */
        let convertTransformersToArrays = (part, path) => {
            if (part.hasOwnProperty('transform')) {
                if (!_.isArray(part.transform)) {
                    part.transform = [part.transform];
                }
            }
        };

        /**
         * Converts transformer definition consisting of just one string into one-element array
         * @param part
         * @param path
         */
        let convertSynthesizersToArrays = (part, path) => {
            if (part.hasOwnProperty('synthesize')) {
                if (!_.isArray(part.synthesize)) {
                    part.synthesize = [part.synthesize];
                }
            }
        };

        /**
         * Validates format and field presence for defaultSortBy attribute
         * @param part
         * @param path
         */
        let validateDefaultSortBy = (part, path) => {
            if (part.hasOwnProperty('defaultSortBy')) {
                if ('object' != typeof part.defaultSortBy) {
                    errors.push(`defaultSortBy in ${path.join('.')} has incorrect format, must be an object`);
                } else {
                    _.each(part.defaultSortBy, (val, key) => {
                        if (val !== -1 && val !== 1) {
                            errors.push(`defaultSortBy in ${path.join('.')} has incorrect format, the sorting order must be either 1 or -1`);
                        }
                        if (!part.fields.hasOwnProperty(key) && key !== '_id') {
                            errors.push(`defaultSortBy in ${path.join('.')} refers to nonexisting field "${key}"`);
                        }
                    })
                }
            }
        };

        /**
         * Uses validatorShortcuts to expand validators into full form
         * @param part
         * @param path
         */
        let expandValidators = (part, path) => {
            if (part.hasOwnProperty('validate')) {
                if ('string' == typeof part.validate) {
                    part.validate = [part.validate];
                }
                part.validate = _.map(part.validate, (handler) => {
                    let matches;
                    let handlerSpec;
                    if ('string' == typeof handler && ( matches = handler.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(\((.*)\))?$/) )) {
                        let handlerName = matches[1];
                        let matchedArguments = matches[3] ? matches[3].split(',') : [];
                        if (appModel.validatorShortcuts[handlerName]) {
                            handlerSpec = {
                                validator: handlerName,
                                arguments: _.mapValues(appModel.validatorShortcuts[handlerName].arguments, (o) => {
                                    return o.replace(/\$(\d+)/g, (match, p1) => {
                                        return matchedArguments[parseInt(p1) - 1];
                                    });
                                }),
                                errorMessages: appModel.validatorShortcuts[handlerName].errorMessages
                            }
                        } else {
                            errors.push(`No validator shortcut is provided for validator ${handlerName}`);
                        }
                    } else if ('object' === typeof handler && handler.validator) {
                        handlerSpec = handler;
                    } else {
                        errors.push(`Unable to expand validator ${JSON.stringify(handler)} for ${path.join('.')}`);
                    }
                    return handlerSpec;
                });
                // make sure all validators exist
                _.forOwn(part.validate, (val, key) => {
                    if (!appModelHelpers.Validators.hasOwnProperty(val.validator)) {
                        errors.push(`Validator "${val.validator}" doesn't exist in ${path.join('.')}`);
                    }
                });
            }
        };

        /**
         * Converts values like "true" and "false" into booleans for attributes accepting boolean values (like "visible" or "required")
         * @param part
         * @param path
         */
        let convertStringsForNonstringAttributes = (part, path) => {
            _.forOwn(part,(val,key) => {
                if (typeof appModel.metaschema[key] !== 'undefined' && appModel.metaschema[key].type === 'Boolean' && _.isString(val)) {
                    part[key] = _.includes(["true", "TRUE", "True", "yes", "YES", "Yes"], val);
                }
            });
        };

        /**
         * Validates that all transformers referred in the model exist
         * @param part
         * @param path
         */
        let makeSureAllTransformersExist = (part, path) => {
            if (part.hasOwnProperty('transform')) {
                _.forEach(part.transform, (val, key) => {
                    if (_.isArray(val)) {
                        if (!appModelHelpers.Transformers.hasOwnProperty(val[0])) {
                            errors.push(`Transformer "${val[0]}" doesn't exist in ${path.join('.')}`);
                        }
                        if (!appModelHelpers.Transformers.hasOwnProperty(val[1])) {
                            errors.push(`Transformer "${val[1]}" doesn't exist in ${path.join('.')}`);
                        }
                        if (val.length > 2) {
                            errors.push(`Transformer "${val}" doesn't look right in ${path.join('.')} (if array then must contain only two elements)`);
                        }

                    } else if (!appModelHelpers.Transformers.hasOwnProperty(val)) {
                        errors.push(`Transformer "${val}" doesn't exist in ${path.join('.')}`);
                    }
                });
            }
        };

        /**
         * Validates lookups format and sets default fields
         * @param part
         * @param path
         */
        let validateLookups = (part, path) => {
            if (part.hasOwnProperty('lookup')) {
                if (!part.hasOwnProperty('transform')) { // if there is transform, it's already an array, see above
                    part.transform = [];
                }
                part.transform.push("addLookupDetails");
                if (!part.lookup.table) {
                    errors.push(`Lookup in ${path.join('.')} doesn't have property "table"`);
                } else {
                    // TODO: add support for multiple tables
                    let validateLookupTable = (tableName, foreignKey, label) => {
                        if (tableName.startsWith("/")) {
                            let appModelPath = tableName.replace("/", "").replace(/:[a-zA-Z0-9_]+/g, "fields").replace(/\//g, ".");
                            let appModelElement = _.get(appModel.models, appModelPath);
                            if(appModelElement && appModelElement.type != "Subschema") {
                                errors.push(`Lookup in ${path.join('.')} refers to nonexisting subschema "${tableName}"`);
                            }
                        } else if (!appModel.models[tableName]) {
                            errors.push(`Lookup in ${path.join('.')} refers to nonexisting collection "${tableName}"`);
                        } else {
                            if (!appModel.models[tableName].fields[foreignKey] && part.lookup.foreignKey !== '_id') {
                                errors.push(`Lookup in ${path.join('.')} refers to nonexisting foreignKey "${foreignKey}"`);
                            }
                            if (!label) {
                                errors.push(`Lookup in ${path.join('.')} doesn't have property "label"`);
                            } else if (!appModel.models[tableName].fields[label]) {
                                errors.push(`Lookup in ${path.join('.')} refers to nonexisting label "${label}"`);
                            }
                        }
                    };
                    // TODO: use default from metaschema here?
                    if (_.isString(part.lookup.table)) {
                        if (!part.lookup.foreignKey) {
                            part.lookup.foreignKey = "_id";
                        }
                        validateLookupTable(part.lookup.table, part.lookup.foreignKey, part.lookup.label);
                    } else {
                        _.keys(part.lookup.table).forEach((key) => {
                            if (!part.lookup.table[key].foreignKey) {
                                part.lookup.table[key].foreignKey = "_id";
                            }
                            validateLookupTable(key, part.lookup.table[key].foreignKey, part.lookup.table[key].label);
                        });
                    }
                    let partKey = path[path.length - 1];
                    if (!part.lookup.id) {
                        part.lookup.id = _(path).difference(["fields"]).map(v => _.capitalize(v)).value().join("");
                    }
                    // TODO: validate ID uniqueness? Currently appLookups are only detected in lib/app.js#addRoutesToSubschemas
                }
            }
        };

        /**
         * Validates that all schema and subschema names are plural - important for mongoose
         * @param part
         * @param path
         */
        let validateSchemaNamesArePlural = (part, path) => {
            if (( 'Schema' == part.type || 'Subschema' == part.type) && !path[path.length - 1].endsWith('s')) {
                errors.push(`Schema and subschema names must be plural in ${path.join('.')}`);
            }
            // add _id field to schemas and subschemas
            // These are created in the mongoose model implicitly (schemas) or explicitly (subschemas)
            // so possibly it makes sense to move their creation here
            /*
            if ('Schema' == part.type) {
                part.fields["_id"] = {
                    "type": "ObjectID",
                    "visible": false,
                    "comment": "Added to implicitly include in all datatables",
                    "generated": true,
                    "fullName": "Schema element id",
                    "description": "Schema element id"
                };
            }
            if ('Subschema' == part.type) {
                part.fields["_id"] = {
                    "type": "ObjectID",
                    "visible": false,
                    "comment": "Added to implicitly include in all datatables",
                    "generated": true,
                    "fullName": "Subschema element id",
                    "description": "Subschema element id",
                    "generatorSpecification": ["_id()"] // need to specify here because of the order of operations
                };
            }
            */
        };

        /**
         * fullName is a required attribute, generate it from the key if necessary
         * @param part
         * @param path
         */
        let generateFullName = (part, path) => {
            let partKey = path[path.length - 1];
            if (appModel.metaschema.fullName && !part.fullName) { // some tests and potentially apps do not have fullName in metaschema
                part.fullName = butil.camelCase2CamelText(partKey);
            }
        };

        /**
         * Validate that all required attributes are in place and set them to defaults if necessary
         * TODO: use context for defaults (see metaschema
         * @param part
         * @param path
         */
        let validateRequiredAttributes = (part, path) => {
            _.forOwn(appModel.metaschema, (val, key) => {
                if (val.required && !part.hasOwnProperty(key)) {
                    errors.push(`Attribute ${path.join('.')} doesn't have required property "${key}"`);
                }
            });
        };

        /**
         * Sets certain attributes to defaults where it's difficult to enforce them from metaschema
         * @param part
         * @param path
         */
        let setDefaultAttributes = (part, path) => {
            let setAttribute = (part, attr) => {
                if (appModel.metaschema.hasOwnProperty(attr) && appModel.metaschema[attr].hasOwnProperty('default') && !part.hasOwnProperty(attr)) {
                    part[attr] = appModel.metaschema[attr].default;
                }
            };
            if (part.type) {
                if (part.type === 'Schema' || part.type === 'Subschema') {
                    //setAttribute(part, 'requiresAuthentication'); // depricated, now we use permission 'authenticated'
                    setAttribute(part, 'defaultSortBy');
                } else {
                    setAttribute(part, 'visible');
                    setAttribute(part, 'visibilityPriority');
                    setAttribute(part, 'responsivePriority');
                    setAttribute(part, 'width');
                }
            }
        };

        /**
         * Loads data specified in external file for all metaschema attributes that have supportsExternalData == true
         * @param part
         * @param path
         */
        let loadExternalData = (part, path) => {
            _.forEach(_.reduce(m.metaschema, function (res, val, key) {
                if (val.supportsExternalData) {
                    res.push(key)
                }
                return res
            }, []), (reference) => {
                if (part.hasOwnProperty(reference) && 'object' === typeof part[reference]) {
                    if (part[reference].type && 'file' === part[reference].type && 'string' === typeof part[reference].link) {
                        let isJson = part[reference].link.endsWith('.json');
                        let defaultFilePath = `./model/private/${part[reference].link}`;
                        if (fs.existsSync(defaultFilePath)) {
                            part[reference] = fs.readFileSync(defaultFilePath, 'utf-8');
                        } else {
                            part[reference] = fs.readFileSync(`${process.env.APP_MODEL_DIR}/private/${part[reference].link}`, 'utf-8');
                        }
                        if (isJson) {
                            part[reference] = JSON.parse(part[reference]);
                        }
                    }
                }
            });
        };

        /**
         * Removes all incomplete actions from the interface
         * @param part
         * @param path
         */
        let deleteDisabledActions = (part, path) => {
            if(part.type === 'Schema' && part.actions && part.actions.fields) {
                _.forOwn(part.actions.fields, (val,key) => {
                    if(val == false) {
                        delete part.actions.fields[key];
                    }
                });
            }
        };


        /**
         * Removes all disabled menu items
         * @param part
         * @param path
         */
        let deleteDisabledMenuItems = (part, path) => {
            if(part.type === 'Menu' && part.fields) {
                _.forOwn(part.fields, (val,key) => {
                    if(val == false) {
                        delete part.fields[key];
                    }
                    //log.trace(part, path);
                });
            }
        };

        /**
         * Validates that referred list exists in appModelHelpers.Lists
         * Add dynamic list validator if necessary
         * Note: there is another check when Mongoose model is being beuilt, delete this one?
         * @param part
         * @param key
         */
        let validateReferredListExists = (part, path) => {
            if (part.list && 'string' == typeof part.list && !appModelHelpers.Lists.hasOwnProperty(part.list)) {
                errors.push(`Attribute ${_.concat(path, 'list').join('.')} refers to unknown list ${part.list}`);
            } else if (_.isString(appModelHelpers.Lists[part.list])) {
                if (part.hasOwnProperty('validate')) {
                    if (_.isString(part.validate)) {
                        part.validate = [part.validate];
                    }
                    part.validate.push("dynamicListValue");
                } else {
                    part.validate = ["dynamicListValue"];
                }
            }
        };

        /**
         * Recursively processes all fields in the part
         * @param part
         * @param key
         */
        let validateFields = (validator, part, path) => {
            if (part.hasOwnProperty('fields')) {
                validator(part.fields, _.concat(path, 'fields'));
            }
        };

        /**
         * Deleted menu items set to null, allows deleting default menu items like "home"
         * @param validator
         * @param part
         * @param path
         */
        /*
        let delteEmptyMenuItems = (validator, part, path) => {
            if (part.hasOwnProperty('fields')) {
                validator(part.fields, _.concat(path, 'fields'));
            }
        };
        */

        // These validators are called for all fields in the schema -----------------

        /**
         * Deletes all attributes "comment" from the app model
         * @param part
         * @param key
         */
        let deleteComments = (part, path, val, key) => {
            if (_.includes(['comment'], key)) {
                delete part[key];
            }
        };

        /**
         * If metaschema has list of allowed values for given field then validate that the app model attribute value is in that list
         * @param part
         * @param key
         */
        let validateValuesAreAllowedInMetaschema = (part, path, val, key) => {
            if (appModel.metaschema[key] && appModel.metaschema[key].hasOwnProperty('list') && !_.includes(appModel.metaschema[key].list, val)) { // value is allowed in metaschema
                errors.push(`Invalid value ${val} for ${_.concat(path, key).join('.')}`);
            }
        };

        /**
         * Validates that the attribute is allowed in metaschema
         * @param part
         * @param key
         */
        let validateAttributeAllowed = (part, path, val, key) => {
            if (!_.includes(allowedAttributes, key)) { // attribute of app model is listed in metadata
                errors.push(`Unknown attribute ${_.concat(path, key).join('.')}`);
            }
        };

        // recursive validation code -----------------------

        let validateModelPart = (part, path) => {
            mergeTypeDefaults(part, path);
            convertTransformersToArrays(part, path);
            convertSynthesizersToArrays(part, path);
            validateDefaultSortBy(part, path);
            validateReferredListExists(part, path);
            expandValidators(part, path);
            convertStringsForNonstringAttributes(part, path);
            makeSureAllTransformersExist(part, path);
            validateLookups(part, path);
            validateSchemaNamesArePlural(part, path);
            generateFullName(part, path);
            validateRequiredAttributes(part, path);
            setDefaultAttributes(part, path);
            deleteDisabledActions(part, path);
            // TODO: validate that referred renderer exists

            validateFields(validateModelParts, part, path);

            // validate and cleanup individual fields
            _.forOwn(part, (val, key) => {
                validateAttributeAllowed(part, path, val, key);
                validateValuesAreAllowedInMetaschema(part, path, val, key);
                deleteComments(part, path, val, key);
            });
        };

        let validateInterfacePart = (part, path) => {
            loadExternalData(part, path);

            deleteDisabledMenuItems(part, path);
            validateFields(validateInterfaceParts, part, path);

            // validate and cleanup individual fields
            _.forOwn(part, (val, key) => {
                //validateValuesAreAllowedInMetaschema(part, path, val, key); // fails on dashboards
                deleteComments(part, path, val, key);
            });
        };

        let validateInterfaceParts = (parts, path) => {
            _.forOwn(parts, (val, key) => {
                validateInterfacePart(val, _.concat(path, key));
            });
        };
        let validateModelParts = (parts, path) => {
            _.forOwn(parts, (val, key) => {
                validateModelPart(val, _.concat(path, key));
            });
        };

        // Yes, everything above were just helper  methods, the actual validateAndCleanupAppModel code runs from here

        validateModelParts(appModel.models, []);

        if (appModel.interface) {
            validateInterfaceParts(appModel.interface, []); // TODO: add test for this
            _.forEach(['loginPage', 'charts', 'pages'], (interfacePart) => {
                if (appModel.interface[interfacePart]) {
                    validateInterfaceParts(appModel.interface[interfacePart], []);
                }
            });
        }
        return errors;
    };

    /**
     * Generates mongoose models based on models JSON and puts them in m.mongooseModels hash
     * Note that some methods require m.mongoos_models to be populated before they work correctly
     * @param db the mongoose db connection
     * @param models JSON defining the model
     * @param cb callback(err)
     */
    m.generateMongooseModels = (db, models, cb) => {
        async.eachOfSeries(models, function (model, name, cb) {
            let mongooseSchemaDefinition = {};
            m.getMongooseSchemaDefinition(null, model, mongooseSchemaDefinition);
            let err;
            try {
                const schema = new mongoose.Schema(mongooseSchemaDefinition, {strict: false, versionKey: false});
                if (model.schemaTransform) {
                    if ('string' == typeof model.schemaTransform) {
                        model.schemaTransform = [model.schemaTransform];
                    }
                    model.schemaTransform.forEach((transformer) => {
                        schemaTransformers[transformer](schema);
                    });
                }
                log.trace(`Generating model ${name}`);
                //log.trace( `Generating model ${name}:\n${JSON.stringify(mongooseSchemaDefinition,null,4)}` );
                db.model(name, schema);
            } catch (e) {
                err = "Error: " + e + ". Unable to generate mongoose model " + name;
                log.error("MDL001", err);
            }
            cb(err);
        }, cb);
    };
    return m;
};
