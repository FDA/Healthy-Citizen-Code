/**
 * @module model-util
 * This module provides utilities shared between multiple applications and allows models manipulation for
 * Conceptant applications.
 */

const log = require('log4js').getLogger('lib/model');
const mongoose = require('mongoose');
const fs = require('fs');
const merge = require('merge');
const async = require('async');
const glob = require('glob');
const _ = require('lodash');
const appRoot = require('app-root-path').path;
const butil = require('./backend-util');

const schemaTransformers = require('./schema-transformers')();
const Schema = mongoose.Schema;
const RJSON = require('relaxed-json');

module.exports = function (appLib) {
  const m = {};
  /**
   * Contains model's metaschema
   * @type {{}}
   */
  m.metaschema = {};

  const LookupObjectIDSchema = new Schema({
    _id: String,
    table: String,
    label: String,
  });

  /**
   * Maps HC schema master file types to mongoose types
   * @enum {Object}
   */
  m.mongooseTypesMapping = {
    'String': String,
    'Date': Date,
    'Number': Number,
    'Boolean': Boolean,
    'Mixed': mongoose.Schema.Types.Mixed,
    'ObjectID': mongoose.Schema.Types.ObjectId,
    'LookupObjectID': LookupObjectIDSchema,
    'String[]': [String],
    'Date[]': [Date],
    'Number[]': [Number],
    'Boolean[]': [Boolean],
    'Mixed[]': [mongoose.Schema.Types.Mixed],
    'Object[]': [mongoose.Schema.Types.Mixed],
    'ObjectID[]': [mongoose.Schema.Types.ObjectId],
    'LookupObjectID[]': [LookupObjectIDSchema],
    // the following fields will only contain file names
    'Image': [mongoose.Schema.Types.Mixed],
    'Video': [mongoose.Schema.Types.Mixed],
    'Audio': [mongoose.Schema.Types.Mixed],
    'File': [mongoose.Schema.Types.Mixed],
    'Image[]': [mongoose.Schema.Types.Mixed],
    'Video[]': [mongoose.Schema.Types.Mixed],
    'Audio[]': [mongoose.Schema.Types.Mixed],
    'File[]': [mongoose.Schema.Types.Mixed],
    'Location': [Number],
    'Barcode': String,
  };

  /**
   * Combines all files in a directory into a single JSON representing the HC master schema
   * @param path path to the directory containing parts of the schema
   * @returns {Object} JSON containing the master model
   */
  m.getCombinedModel = (appModelPath, backendModelPath) => {
    const files = _.concat(glob.sync(`${backendModelPath}/**/*.json`), glob.sync(`${appModelPath}/**/*.json`));
    let model = {};
    files.forEach(function (file) {
      log.trace('Merging', file);
      let content = '';
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
          'type': 'Date',
          'visible': false,
          'generated': true,
          'fullName': 'Updated',
          'description': 'Date when the record was last created',
        };
      }
      if (!obj.fields.updated) {
        obj.fields.updated = {
          'type': 'Date',
          'visible': false,
          'generated': true,
          'fullName': 'Updated',
          'description': 'Date when the record was last updated',
        };
      }
      if (!obj.fields.deleted) {
        obj.fields.deleted = {
          'type': 'Date',
          'visible': false,
          'generated': true,
          'fullName': 'Deleted',
          'description': 'Date when the record was deleted',
        };
      }
    };
    if (obj.type == 'Group') {
      // do nothing
    } else if (obj.type == 'Schema') {
      addCUDFields(obj);
      obj.fields['generatorBatchNumber'] = {
        'type': 'String',
        'visible': false,
        //"comment": "Do not set this to anything for real records, they may get wiped out as autogenerated otherwise", // this will be eliminated by backed
        'generated': true,
        'fullName': 'Generator Batch Number',
        'description': 'Set to the ID of generator batch for synthetic records',
      };
      for (let field in obj.fields) {
        if (obj.fields.hasOwnProperty(field)) {
          m.getMongooseSchemaDefinition(field, obj.fields[field], mongooseModel);
        }
      }
    } else if (obj.type == 'Subschema') {
      // TODO: Move this into validateModelPart
      addCUDFields(obj);
      obj.fields['_id'] = {
        'type': 'ObjectID',
        'visible': false,
        //"comment": "This is internal fields identifying each element of subschema", // this will be eliminated by backend
        'generated': true,
        'fullName': 'Subschema element id',
        'description': 'Subschema element id',
        'generatorSpecification': ['_id()'] // need to specify here because of the order of operations
      };
      mongooseModel[name] = [{}];
      for (let field in obj.fields) {
        if (obj.fields.hasOwnProperty(field)) {
          m.getMongooseSchemaDefinition(field, obj.fields[field], mongooseModel[name][0]);
        }
      }
    } else if (obj.type == 'Object') {
      mongooseModel[name] = {};
      for (let field in obj.fields) {
        if (obj.fields.hasOwnProperty(field)) {
          m.getMongooseSchemaDefinition(field, obj.fields[field], mongooseModel[name]);
        }
      }
    } else if (obj.type == 'Array') {
      mongooseModel[name] = [{}];
      for (let field in obj.fields) {
        if (obj.fields.hasOwnProperty(field)) {
          m.getMongooseSchemaDefinition(field, obj.fields[field], mongooseModel[name][0]);
        }
      }
      // TODO: currently lookups are only supported for individual ObjectID. Add support of any types of fields and arrays of fields in the future
    } else if (obj.type == 'Location') {
      mongooseModel[name] = {type: [Number], index: '2d'};
      setMongooseModelAttribute(obj, 'index', mongooseModel[name], 'index', true);
    } else {
      mongooseModel[name] = {
        type: m.mongooseTypesMapping[obj.type],
      };
      setMongooseModelAttribute(obj, 'unique', mongooseModel[name], 'unique', false);
      setMongooseModelAttribute(obj, 'index', mongooseModel[name], 'index', false);
      // TODO: min, max
      // TODO: ref: http://stackoverflow.com/questions/26008555/foreign-key-mongoose ?
      // TODO:  min/maxLength, validator, validatorF, default, defaultF, listUrl from definition?
      if (obj.hasOwnProperty('list')) {
        if (appLib.appModelHelpers.Lists[obj.list]) {
          if (_.isString(appLib.appModelHelpers.Lists[obj.list])) {
            // do nothing, will need to validate value in the code since it's 100% dynamic
          } else {
            //mongooseModel[name].enum = Object.keys(appLib.appModelHelpers.Lists[obj.list]); // Mongoose validations do not allow creating records with empty enum values, which is what we need for optional fields
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
    const allowedAttributes = _.keys(appLib.appModel.metaschema);

    // These validators are called for specific part of the model (vs all attributes of the part, see below) -----

    /**
     * Merges the defaults set in the typeDefaults and subtypeDefaults into the appModel part
     * @param part
     * @param path
     */
    let mergeTypeDefaults = (part, path) => {
      part.type = _.get(part, 'type', appLib.appModel.metaschema.type.default);
      let defaults = _.get(appLib.appModel, `typeDefaults.fields.${part.type}`, {});
      let doNotOverwrite = (objValue, srcValue) => { // objValue is the target value
        if (_.isArray(objValue) && _.isArray(srcValue)) {
          return srcValue.concat(objValue);
        } else if ('undefined' === typeof objValue) {
          return _.cloneDeep(srcValue);
        } else if (null == srcValue || objValue == null) {
          return null;
        } else if (_.isString(srcValue) && _.isString(objValue)) {
          return srcValue;
        } else {
          return _.mergeWith(objValue, srcValue, doNotOverwrite);
          //return objValue;
        }
      };
      _.mergeWith(part, defaults, doNotOverwrite);
      if (part.hasOwnProperty('subtype')) {
        let defaults = _.get(appLib.appModel, `subtypeDefaults.fields.${part.subtype}`, {});
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
          });
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
          if ('string' == typeof handler && (matches = handler.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(\((.*)\))?$/))) {
            let handlerName = matches[1];
            let matchedArguments = matches[3] ? matches[3].split(',') : [];
            if (appLib.appModel.validatorShortcuts[handlerName]) {
              handlerSpec = {
                validator: handlerName,
                arguments: _.mapValues(appLib.appModel.validatorShortcuts[handlerName].arguments, (o) => {
                  return o.replace(/\$(\d+)/g, (match, p1) => {
                    return matchedArguments[parseInt(p1) - 1];
                  });
                }),
                errorMessages: appLib.appModel.validatorShortcuts[handlerName].errorMessages,
              };
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
          if (!appLib.appModelHelpers.Validators.hasOwnProperty(val.validator)) {
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
      _.forOwn(part, (val, key) => {
        if (typeof appLib.appModel.metaschema[key] !== 'undefined' && appLib.appModel.metaschema[key].type === 'Boolean' && _.isString(val)) {
          //part[key] = _.includes(["true", "TRUE", "True", "yes", "YES", "Yes"], val);
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
            if (!appLib.appModelHelpers.Transformers.hasOwnProperty(val[0])) {
              errors.push(`Transformer "${val[0]}" doesn't exist in ${path.join('.')}`);
            }
            if (!appLib.appModelHelpers.Transformers.hasOwnProperty(val[1])) {
              errors.push(`Transformer "${val[1]}" doesn't exist in ${path.join('.')}`);
            }
            if (val.length > 2) {
              errors.push(`Transformer "${val}" doesn't look right in ${path.join('.')} (if array then must contain only two elements)`);
            }

          } else if (!appLib.appModelHelpers.Transformers.hasOwnProperty(val)) {
            errors.push(`Transformer "${val}" doesn't exist in ${path.join('.')}`);
          }
        });
      }
    };

    const transformLookups = (part, path) => {
      const lookup = part.lookup;

      if (lookup) {
        const tableProp = lookup.table;

        if (_.isString(tableProp)) {
          part.lookup = {
            table: {
              [tableProp]: {
                foreignKey: lookup.foreignKey || '_id',
                label: lookup.label || '_id',
                table: tableProp,
              },
            },
            id: lookup.id || generateLookupId(path),
          };
        } else if (_.isPlainObject(tableProp)) {
          _.forEach(tableProp, (tableLookup, tableName) => {
            tableLookup.table = tableName;
          });
          lookup.id = generateLookupId(path);
        }

        _.forEach(part.lookup.table, (tableLookup) => {
          transformLookupScopes(tableLookup);
        });
      }

      function generateLookupId (path) {
        return _(path).difference(['fields']).map(v => _.capitalize(v)).value().join('');
      }

      function transformLookupScopes (tableLookup) {
        _.forEach(tableLookup.scopes, (scope) => {
          if (_.isString(scope.permissions)) {
            const permissionName = scope.permissions;
            scope.permissions = {
              view: permissionName,
            };
          }
        });
        tableLookup.scopes = _.merge(tableLookup.scopes, appLib.accessCfg.getAdminLookupScopeForViewAction());
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
        part.transform.push('addLookupDetails');
        if (!part.lookup.table) {
          errors.push(`Lookup in ${path.join('.')} doesn't have property "table"`);
        } else {
          // TODO: add support for multiple tables
          function validateTableLookup (tableLookup) {
            const tableName = tableLookup.table;
            const foreignKey = tableLookup.foreignKey;
            const label = tableLookup.label;
            const tableLookupErrors = [];

            if (!tableName) {
              tableLookupErrors.push(`Lookup in ${path.join('.')} must have 'table' field`);
            }
            if (!foreignKey) {
              tableLookupErrors.push(`Lookup in ${path.join('.')} must have 'foreignKey' field`);
            }
            if (!label) {
              tableLookupErrors.push(`Lookup in ${path.join('.')} must have 'label' field`);
            }
            if (!_.isEmpty(tableLookupErrors)) {
              errors = errors.concat(tableLookupErrors);
              return;
            }

            if (tableName.startsWith('/')) {
              let appModelPath = tableName.replace('/', '').replace(/:[a-zA-Z0-9_]+/g, 'fields').replace(/\//g, '.');
              let appModelElement = _.get(appLib.appModel.models, appModelPath);
              if (appModelElement && appModelElement.type != 'Subschema') {
                tableLookupErrors.push(`Lookup in ${path.join('.')} refers to nonexisting subschema "${tableName}"`);
              }
            } else if (!appLib.appModel.models[tableName]) {
              tableLookupErrors.push(`Lookup in ${path.join('.')} refers to nonexisting collection "${tableName}"`);
            } else {
              if (!appLib.appModel.models[tableName].fields[foreignKey] && foreignKey !== '_id') {
                tableLookupErrors.push(`Lookup in ${path.join('.')} refers to nonexisting foreignKey "${foreignKey}"`);
              }
              if (!appLib.appModel.models[tableName].fields[label] && label !== '_id') {
                tableLookupErrors.push(`Lookup in ${path.join('.')} refers to nonexisting label "${label}"`);
              }
            }
            errors = errors.concat(tableLookupErrors);
          }

          function validateLookupId (lookup) {
            if (!lookup.id) {
              errors.push(`Lookup in ${path.join('.')} must have 'id' field`);
            }
          }

          // TODO: use default from metaschema here?
          _.forEach(part.lookup.table, (tableLookup, table) => {
            validateTableLookup(tableLookup);
          });
          validateLookupId(part.lookup);
        }
      }
    };

    /**
     * Validates that all schema and subschema names are plural - important for mongoose
     * @param part
     * @param path
     */
    let validateSchemaNamesArePlural = (part, path) => {
      if (('Schema' == part.type || 'Subschema' == part.type) && !path[path.length - 1].endsWith('s')) {
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
      if (appLib.appModel.metaschema.fullName && !part.fullName) { // some tests and potentially apps do not have fullName in metaschema
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
      _.forOwn(appLib.appModel.metaschema, (val, key) => {
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
        if (appLib.appModel.metaschema.hasOwnProperty(attr) && appLib.appModel.metaschema[attr].hasOwnProperty('default') && !part.hasOwnProperty(attr)) {
          part[attr] = appLib.appModel.metaschema[attr].default;
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
          res.push(key);
        }
        return res;
      }, []), (reference) => {
        if (part.hasOwnProperty(reference) && 'object' === typeof part[reference]) {
          if (part[reference].type && 'file' === part[reference].type && 'string' === typeof part[reference].link) {
            let isJson = part[reference].link.endsWith('.json');
            let defaultFilePath = require('path').resolve(appRoot, `model/private/${part[reference].link}`);
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
    let transformActions = (part, path) => {
      if (part.type === 'Schema') {
        const actions = _.get(part, 'actions', {fields: {}});
        // delete old disabled actions
        _.forEach(actions.fields, (val, key) => {
          if (val == false) {
            delete actions.fields[key];
          }
        });
        // inject admin action permission if not exists
        _.forEach(appLib.accessCfg.DEFAULT_ACTIONS, (action) => {
          if (!actions.fields[action] || !actions.fields[action].permissions) {
            _.set(actions.fields, `${action}.permissions`, appLib.accessCfg.PERMISSIONS.accessAsSuperAdmin);
          }
        });

        part.actions = actions;
      }
    };

    /**
     * Removes all disabled menu items
     * @param part
     * @param path
     */
    let deleteDisabledMenuItems = (part, path) => {
      if (part.type === 'Menu' && part.fields) {
        _.forOwn(part.fields, (val, key) => {
          if (val == false) {
            delete part.fields[key];
          }
        });
      }
    };


    /**
     * Collects all permission names for future validation with models
     * @param part
     * @param path
     */
    const collectUsedPermissionNames = (part, path) => {
      function addToUsedPermissions (permissions) {
        if (!permissions) {
          return;
        }

        if (_.isString(permissions)) {
          appLib.appModel.usedPermissions.add(permissions);
        } else if (Array.isArray(permissions)) {
          _.flattenDeep(permissions).forEach(permission => {
            if (_.isString(permission)) {
              appLib.appModel.usedPermissions.add(permission);
            } else {
              errors.push(`Found permission with not String type. Permission: ${permission}, path: ${path}`);
            }
          });
        } else if (_.isPlainObject(permissions)) {
          _.forOwn(permissions, (objPermission, key) => {
            addToUsedPermissions(objPermission);
          });
        }
      }

      // Create permission storage if not exist
      if (!appLib.appModel.usedPermissions) {
        appLib.appModel.usedPermissions = new Set();
      }

      // According to 'Attaching Permissions' https://confluence.conceptant.com/pages/viewpage.action?pageId=1016055
      // There are 3 places where permissions are used
      // actions
      const actionFields = _.get(part, 'actions.fields');
      const isSchemaOrSubschema = (part.type === 'Schema' || part.type === 'Subschema');
      if (isSchemaOrSubschema && actionFields) {
        _.forOwn(actionFields, (val, key) => {
          const actionPermissions = _.get(val, 'permissions');
          addToUsedPermissions(actionPermissions);
        });
      }

      // fields
      const modelFields = _.get(part, 'fields');
      if (isSchemaOrSubschema && modelFields) {
        _.forOwn(modelFields, (modelObj, key) => {
          const fieldPermissions = _.get(modelObj, 'permissions');
          addToUsedPermissions(fieldPermissions);
        });
      }

      // scopes
      const scopeFields = _.get(part, 'scopes');
      if (isSchemaOrSubschema && scopeFields) {
        _.forOwn(scopeFields, (scopeObj, key) => {
          const scopePermissions = _.get(scopeObj, 'permissions');
          addToUsedPermissions(scopePermissions);
        });
      }
    };

    /**
     * Validates list format and checks that referred list exists in appModelHelpers.Lists
     * Add dynamic list validator if necessary
     * Note: there is another check when Mongoose model is being beuilt, delete this one?
     * @param part
     * @param path
     */
    function validateLists (part, path) {
      const list = part.list;
      if (!list) {
        return;
      }

      if (_.isPlainObject(list)) {
        const listName = list.name;
        const listVal = list.values;
        const listValByName = _.get(appLib.appModelHelpers, ['Lists', listName]);

        if (listValByName && listVal) {
          errors.push(`Attribute ${_.concat(path, 'list').join('.')} must have only one source of values for list (either 'name' or 'values')`);
        } else if (_.isString(listValByName)) {
          if (part.hasOwnProperty('validate')) {
            if (_.isString(part.validate)) {
              part.validate = [part.validate];
            }
            part.validate.push('dynamicListValue');
          } else {
            part.validate = ['dynamicListValue'];
          }
        } else if (!_.isPlainObject(listValByName || listVal)) {
          errors.push(`Attribute ${_.concat(path, 'list').join('.')} must have list values(inlined or referenced) represented as object`);
        }
      } else {
        errors.push(`Attribute ${_.concat(path, 'list').join('.')} after transformation must be an object.`);
      }
    }

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
      if (appLib.appModel.metaschema[key] && appLib.appModel.metaschema[key].hasOwnProperty('list') && !_.includes(appLib.appModel.metaschema[key].list, val)) { // value is allowed in metaschema
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

    const handlePermissions = () => {
      // if (!appLib.getAuthSettings().enablePermissions) {
      //   log.trace(`Flag enablePermissions is disabled, handling app permissions is skipped.`);
      //   return;
      // }

      transformPermissions();
      validatePermissions();
    };

    const transformPermissions = () => {
      transformInterfaceAppPermissions();
      transformModelPermissions();
      transformListPermissions();

      function transformListPermissions () {
        _.forEach(appLib.ListsPaths, (listPath) => {
          const {scopes} = _.get(appLib.appModel.models, listPath);
          _.forEach(scopes, (scope) => {
            const permissionName = scope.permissions;
            if (_.isString(permissionName)) {
              scope.permissions = {
                'view': permissionName,
              };
            }
          });
        });
      }

      /**
       * Transfrorms permissions according to 'Listing App Permissions' https://confluence.conceptant.com/pages/viewpage.action?pageId=1016055
       */
      function transformInterfaceAppPermissions () {
        const appPermissions = _.get(appLib.appModel, 'interface.app.permissions');
        if (_.isArray(appPermissions)) {
          const transformedAppPermissions = {};
          appPermissions.forEach(appPermission => {
            if (_.isString(appPermission)) {
              transformedAppPermissions[appPermission] = {description: appPermission};
            } else {
              errors.push(`Found not string app permission ${RJSON.stringify(appPermission)} in interface.app.permissions`);
            }
          });
          appLib.appModel.interface.app.permissions = transformedAppPermissions;
        }
      }

      function transformModelPermissions () {
        _.forEach(appLib.appModel.models, (model) => {
          _.forEach(model.scopes, (scope) => {
            const permissionName = scope.permissions;
            if (_.isString(permissionName)) {
              scope.permissions = {};
              _.forEach(appLib.accessCfg.DEFAULT_ACTIONS, (action) => {
                scope.permissions[action] = permissionName;
              });
            }
          });
        });
      }
    };

    const validatePermissions = () => {
      // should be created in method collectUsedPermissionNames
      if (!appLib.appModel.usedPermissions) {
        const errMsg = `Used permissions are not preloaded`;
        log.error(errMsg);
        throw new Error(errMsg);
      }

      const declaredPermissions = _.get(appLib.appModel, 'interface.app.permissions', {});

      for (let usedPermissionName of appLib.appModel.usedPermissions.values()) {
        if (declaredPermissions[usedPermissionName] === undefined) {
          errors.push(`Permission with name '${usedPermissionName}' is used but not declared in interface.app.permissions.`);
        }
      }

      for (let declaredPermissionName of _.keys(declaredPermissions)) {
        if (!appLib.appModel.usedPermissions.has(declaredPermissionName)) {
          log.warn(`Permission with name '${declaredPermissionName}' is declared in interface.app.permissions but not used.`);
        }
      }
    };

    const handleAppAuthSettings = () => {
      const authSettings = _.get(appLib.appModel, 'interface.app.auth', {});
      const defaultAuthSettings = _.get(appLib, 'accessCfg.DEFAULT_AUTH_SETTINGS', {});
      const mergedSettings = _.merge(defaultAuthSettings, authSettings);

      if (mergedSettings.requireAuthentication && !mergedSettings.enableAuthentication) {
        log.warn(
          `Found contradictory settings: app.auth.requireAuthentication is true and app.auth.enableAuthentication is false.\n` +
          `app.auth.enableAuthentication will be set to true.`,
        );
        mergedSettings.enableAuthentication = true;
      }
      _.set(appLib.appModel, 'interface.app.auth', mergedSettings);
    };

    /**
     * Needed for dispatching list values of all models with considering scope conditions
     * @param part
     * @param path
     */
    function collectListsMetaInfo (part, path) {
      if (!appLib.ListsPaths) {
        appLib.ListsPaths = [];
        appLib.ListsFields = [];
      }
      if (_.get(part, 'list')) {
        const pathToModelField = path.join('.'); // for example 'roles.fields.permissions'
        appLib.ListsFields.push(pathToModelField);
        appLib.ListsPaths.push(pathToModelField + '.list');
      }
    }

    function transformLists (part, path) {
      const adminListScopeForViewAction = appLib.accessCfg.getAdminListScopeForViewAction();

      if (_.isString(part.list)) {
        // transform to object
        const listName = part.list;
        part.list = {
          name: listName,
          scopes: adminListScopeForViewAction,
        };
        setReturnWhereToList(part.list);
      } else if (_.isPlainObject(part.list)) {
        const listNewFormatFields = ['name', 'values', 'scopes'];
        const isNewListFormat = _.every(part.list, (field, fieldName) => {
          return listNewFormatFields.includes(fieldName);
        });

        if (isNewListFormat) {
          // inject admin scope to existing scopes
          part.list.scopes = _.merge(part.list.scopes, adminListScopeForViewAction);
        } else {
          // set object values to 'values' field and add admin scope
          part.list = {
            values: part.list,
            scopes: adminListScopeForViewAction,
          };
        }
        setReturnWhereToList(part.list);
      }

      function setReturnWhereToList (list) {
        list.where = list.where || 'return true';
        list.return = list.return || 'return $list';
      }

    }

    let validateModelPart = (part, path) => {
      mergeTypeDefaults(part, path);
      convertTransformersToArrays(part, path);
      convertSynthesizersToArrays(part, path);
      validateDefaultSortBy(part, path);
      transformLists(part, path);
      validateLists(part, path);
      collectListsMetaInfo(part, path);
      expandValidators(part, path);
      convertStringsForNonstringAttributes(part, path);
      makeSureAllTransformersExist(part, path);
      transformLookups(part, path);
      validateLookups(part, path);
      // validateSchemaNamesArePlural(part, path);
      generateFullName(part, path);
      validateRequiredAttributes(part, path);
      setDefaultAttributes(part, path);
      transformActions(part, path);
      collectUsedPermissionNames(part, path);
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

    validateModelParts(appLib.appModel.models, []);
    handlePermissions();
    handleAppAuthSettings();

    if (appLib.appModel.interface) {
      validateInterfaceParts(appLib.appModel.interface, []); // TODO: add test for this
      _.forEach(['loginPage', 'charts', 'pages'], (interfacePart) => {
        if (appLib.appModel.interface[interfacePart]) {
          validateInterfaceParts(appLib.appModel.interface[interfacePart], []);
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
        const schema = new mongoose.Schema(mongooseSchemaDefinition,
          {collection: name, strict: false, versionKey: false},
        );
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
        err = 'Error: ' + e + '. Unable to generate mongoose model ' + name;
        log.error('MDL001', err);
      }
      cb(err);
    }, cb);
  };
  return m;
};
