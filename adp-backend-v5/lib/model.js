/**
 * @module model-util
 * This module provides utilities shared between multiple applications and allows models manipulation for
 * Conceptant applications.
 */

const log = require('log4js').getLogger('lib/model');
const mongoose = require('mongoose');
const fs = require('fs-extra');
const glob = require('glob');
const _ = require('lodash');
const appRoot = require('app-root-path').path;
const RJSON = require('relaxed-json');
const Promise = require('bluebird');

const { Schema } = mongoose;
const { camelCase2CamelText } = require('./backend-util');
const schemaTransformers = require('./schema-transformers')();
const {
  getTransformedInterfaceAppPermissions,
  getAppModelWithTransformedPermissions,
  transformListPermissions,
  transformMenuPermissions,
  transformPagesPermissions,
} = require('./access/transform-permissions');

module.exports = appLib => {
  const m = {};

  function ObjectIdOrScalar(key, options) {
    mongoose.SchemaType.call(this, key, options, 'ObjectIdOrScalar');
  }

  ObjectIdOrScalar.prototype = Object.create(mongoose.SchemaType.prototype);

  ObjectIdOrScalar.prototype.cast = val => {
    if (
      !_.isNumber(val) &&
      !_.isString(val) &&
      !_.isBoolean(val) &&
      !(val instanceof mongoose.Types.ObjectId)
    ) {
      throw new Error(`${val} is not an objectId instance or scalar type`);
    }
    return val;
  };

  mongoose.Schema.Types.ObjectIdOrScalar = ObjectIdOrScalar;

  const LookupObjectIDSchema = new Schema({
    _id: ObjectIdOrScalar,
    table: String,
    label: String,
  });

  /**
   * Maps HC schema master file types to mongoose types
   * @enum {Object}
   */
  m.mongooseTypesMapping = {
    String,
    Date,
    Number,
    Boolean,
    Mixed: mongoose.Schema.Types.Mixed,
    ObjectID: mongoose.Schema.Types.ObjectId,
    LookupObjectID: LookupObjectIDSchema,
    TreeSelector: [LookupObjectIDSchema],
    'String[]': [String],
    'Date[]': [Date],
    'Number[]': [Number],
    'Boolean[]': [Boolean],
    'Mixed[]': [mongoose.Schema.Types.Mixed],
    'Object[]': [mongoose.Schema.Types.Mixed],
    'ObjectID[]': [mongoose.Schema.Types.ObjectId],
    'LookupObjectID[]': [LookupObjectIDSchema],
    // the following fields will only contain file names
    Image: [mongoose.Schema.Types.Mixed],
    Video: [mongoose.Schema.Types.Mixed],
    Audio: [mongoose.Schema.Types.Mixed],
    File: [mongoose.Schema.Types.Mixed],
    'Image[]': [mongoose.Schema.Types.Mixed],
    'Video[]': [mongoose.Schema.Types.Mixed],
    'Audio[]': [mongoose.Schema.Types.Mixed],
    'File[]': [mongoose.Schema.Types.Mixed],
    Location: [Number],
    Barcode: String,
  };

  function transformPermissionsInPart(part, errors) {
    const appPermissions = _.get(part, 'interface.app.permissions');
    const newAppPermissions = getTransformedInterfaceAppPermissions(appPermissions, errors);
    newAppPermissions && _.set(part, 'interface.app.permissions', newAppPermissions);
  }

  /**
   * Combines all files passed to appModelSources into a single JSON representing the master schema
   * Merge is done with respect of appModelSources elements order.
   * Elements of appModelSources can be of 2 types: string or object.
   * If element is a string it will be handled as globby pattern
   * and will be expanded to array of json files being parsed to objects.
   * @returns {Object} JSON containing the master model
   * @param appModelSources array contains globby patterns or JS objects
   */
  m.getCombinedModel = appModelSources => {
    let modelSources = [`${appRoot}/model/model/**/*.json`];
    if (!appModelSources) {
      modelSources.push(`${process.env.APP_MODEL_DIR}/model/**/*.json`);
    } else if (_.isArray(appModelSources)) {
      modelSources = modelSources.concat(appModelSources);
    } else {
      throw new Error(`appModelSources must be an array, got: ${appModelSources}`);
    }

    const model = {};
    const errors = [];

    _.each(modelSources, (modelSource, index) => {
      if (_.isPlainObject(modelSource)) {
        log.trace(`Merging modelSources object with index ${index}`);
        transformPermissionsInPart(modelSource, errors);
        _.merge(model, modelSource);
      }
      if (_.isString(modelSource)) {
        log.trace('Merging', modelSource);
        let jsonFiles;
        if (!modelSource.endsWith('json')) {
          jsonFiles = glob.sync(`${modelSource}/**/*.json`);
        } else {
          jsonFiles = glob.sync(modelSource);
        }
        _.each(jsonFiles, jsonFile => {
          try {
            const modelPart = RJSON.parse(fs.readFileSync(jsonFile, 'utf8'));
            transformPermissionsInPart(modelPart, errors);
            _.merge(model, modelPart);
          } catch (e) {
            throw new Error(`Unable to parse model: "${e}" in file "${jsonFile}"`);
          }
        });
      }
    });

    if (!_.isEmpty(errors)) {
      throw new Error(`Errors occurred during model combine: ${errors.join('\n')}`);
    }

    return model;
  };

  // Generating the mongoose model -------------------------------------------------------------

  /**
   * Gets complete mongoose-compatible schema definition based on JSON application model
   * @param {string} name name of the conceptant JSON element to generate mongoose schema definition for
   * @param {Object} obj - conceptant JSON element top generate mongoose schema for
   * @param {Object} mongooseModel mongoose equivalent of the model will go into this parameter
   */
  m.getMongooseSchemaDefinition = (name, obj, mongooseModel) => {
    if (obj.type === 'Group') {
      // do nothing
    } else if (obj.type === 'Schema') {
      obj.fields.generatorBatchNumber = {
        type: 'String',
        showInDatatable: false,
        showInViewDetails: false,
        showInForm: false,
        showInGraphQL: false,
        // "comment": "Do not set this to anything for real records, they may get wiped out as autogenerated otherwise", // this will be eliminated by backed
        generated: true,
        fullName: 'Generator Batch Number',
        description: 'Set to the ID of generator batch for synthetic records',
      };
      for (const field in obj.fields) {
        if (_.has(obj.fields, field)) {
          m.getMongooseSchemaDefinition(field, obj.fields[field], mongooseModel);
        }
      }
    } else if (obj.type === 'Object') {
      mongooseModel[name] = {};
      for (const field in obj.fields) {
        if (_.has(obj.fields, field)) {
          m.getMongooseSchemaDefinition(field, obj.fields[field], mongooseModel[name]);
        }
      }
    } else if (obj.type === 'Array') {
      mongooseModel[name] = [{}];
      for (const field in obj.fields) {
        if (_.has(obj.fields, field)) {
          m.getMongooseSchemaDefinition(field, obj.fields[field], mongooseModel[name][0]);
        }
      }
      // TODO: currently lookups are only supported for individual ObjectID. Add support of any types of fields and arrays of fields in the future
    } else if (obj.type === 'Location') {
      mongooseModel[name] = { type: [Number], index: '2d' };
      mongooseModel[`${name}_label`] = { type: String };
    } else {
      mongooseModel[name] = {
        type: m.mongooseTypesMapping[obj.type],
      };

      setMongooseIndexesByScheme(obj, mongooseModel, name);

      // TODO: min, max
      // TODO: ref: http://stackoverflow.com/questions/26008555/foreign-key-mongoose ?
      // TODO:  min/maxLength, validator, validatorF, default, defaultF, listUrl from definition?
      if (_.has(obj, 'list')) {
        if (appLib.appModelHelpers.Lists[obj.list]) {
          if (_.isString(appLib.appModelHelpers.Lists[obj.list])) {
            // do nothing, will need to validate value in the code since it's 100% dynamic
          } else {
            // mongooseModel[name].enum = Object.keys(appLib.appModelHelpers.Lists[obj.list]); // Mongoose validations do not allow creating records with empty enum values, which is what we need for optional fields
          }
        } else if (_.isObject(obj.list)) {
          // Array is also an object
          // mongooseModel[name].enum = Object.keys(obj.list); // Mongoose validations do not allow creating records with empty enum values, which is what we need for optional fields
        } else {
          throw new Error(
            `List "${
              obj.list
            }" in attribute "${name}" is not defined in lists and is not valid list. Please update helpers/lists.js or the app model. Attribute Specification: ${JSON.stringify(
              obj,
              null,
              2
            )}`
          );
        }
      }
    }

    /**
     * Sets indexes into mongoose model by json scheme
     * @param schemeField
     * @param model
     * @param name
     */
    function setMongooseIndexesByScheme(schemeField, model, fieldName) {
      const mongooseField = model[fieldName];
      if (schemeField.unique) {
        mongooseField.unique = schemeField.unique;
      }

      // do not generate other indexes(not unique) for tests,
      // since it affects only search speed and consume time and disk space
      if (process.env.DEVELOPMENT === 'true') {
        return;
      }

      if (schemeField.index) {
        mongooseField.index = schemeField.index;
      }
      const lookupTypes = ['LookupObjectID', 'LookupObjectID[]', 'TreeSelector'];

      // index speedups getUpdateLinkedLabelsPromise
      if (lookupTypes.includes(schemeField.type)) {
        // considering single or array types mongoose
        const type = _.isArray(mongooseField.type) ? mongooseField.type[0] : mongooseField.type;
        type.index({ _id: 1, table: 1 }, { background: true });
      }
    }
  };

  /**
   * Function for validating following cases:
   * 1. If the object is marked as required and
   * there are no fields marked as required within the object
   * then this situation is the app schema developer's mistake.
   * 2. If the array field is marked as required
   * there are no array element's fields marked as required
   * then this is the app schema author's mistake.
   * More info: https://confluence.conceptant.com/display/DEV/Object+and+Array+Types
   */
  m.validateRequiredFields = models => {
    const allErrors = [];
    _.each(models, (model, modelName) => {
      const hasRequiredParent = false;
      const curPath = [modelName];
      const fieldsErrors = getFieldsErrors(model, curPath, hasRequiredParent);
      allErrors.push(...fieldsErrors);
    });

    return allErrors;

    function getFieldsErrors(part, path, hasRequiredParent) {
      const fieldsErrors = [];
      const validTypesGoDeeper = ['Schema', 'Object', 'Array'];
      if (!validTypesGoDeeper.includes(part.type)) {
        return fieldsErrors;
      }

      let isPartHasRequiredFields = false;
      _.each(part.fields, (field, fieldName) => {
        const isFieldRequired = field.required === true;
        isPartHasRequiredFields = isPartHasRequiredFields || isFieldRequired;
        if (validTypesGoDeeper.includes(field.type)) {
          const nestedFieldsErrors = getFieldsErrors(
            field,
            _.concat(path, fieldName),
            isFieldRequired
          );
          fieldsErrors.push(...nestedFieldsErrors);
        }
      });
      if (!isPartHasRequiredFields && hasRequiredParent) {
        fieldsErrors.push(
          `Model part by path '${path.join('.')}' is required but doesn't have any required field`
        );
      }
      return fieldsErrors;
    }
  };

  /**
   * Validates that the app model matches metaschema
   * Also augments the model with defaults for subtypes, lookups etc
   * @returns {{warnings: Array, errors: Array}}
   */
  // TODO: rewrite using m.traverseAppModel ?
  // TODO: split this method into multiple functions, it's getting big
  // TODO: add validation for hooks existence and that its returning Promises
  m.validateAndCleanupAppModel = () => {
    let errors = [];
    const warnings = [];
    const allowedAttributes = _.keys(appLib.appModel.metaschema);

    setAppAuthSettings();
    validateModelParts(appLib.appModel.models, []);
    handlePermissions();
    addLookupMeta();
    const requiredWarnings = m.validateRequiredFields(appLib.appModel.models);
    warnings.push(...requiredWarnings);

    if (appLib.appModel.interface) {
      validateInterfaceParts(appLib.appModel.interface, []); // TODO: add test for this
      _.each(['loginPage', 'charts', 'pages'], interfacePart => {
        if (appLib.appModel.interface[interfacePart]) {
          validateInterfaceParts(appLib.appModel.interface[interfacePart], []);
        }
      });
    }
    return { errors, warnings };

    // These validators are called for specific part of the model (vs all attributes of the part, see below) -----

    function addLookupMeta() {
      // used to transform lookup._id sent from fronted as String to ObjectID.
      appLib.lookupFieldsMeta = {};
      // used to update linked labels when original record is changed
      appLib.labelFieldsMeta = {};

      _.each(appLib.appModel.models, (schema, schemaName) => {
        _.each(schema.fields, (field, fieldName) => {
          if (field.type.startsWith('LookupObjectID')) {
            _.set(appLib.lookupFieldsMeta, [schemaName, fieldName], field.lookup.table);

            // create labelMeta in format
            // 'table': { 'labelField.nested.path': [{'lookupTable1.nested.path'}]
            // to update lookupTables during updating label field
            // TODO: add nested paths
            _.each(field.lookup.table, (tableLookup, tableName) => {
              const lookupPathsMeta =
                _.get(appLib.labelFieldsMeta, [tableName, tableLookup.label]) || [];
              lookupPathsMeta.push({
                scheme: schemaName,
                path: fieldName, // may be nested
                isMultiple: field.type.endsWith('[]'), // need this info for updating object or array
                fieldType: field.type,
                required: field.required,
                foreignKey: tableLookup.foreignKey,
              });
              _.set(appLib.labelFieldsMeta, [tableName, tableLookup.label], lookupPathsMeta);
            });
          }

          if (field.type === 'TreeSelector') {
            const treeSelectorTables = _.omit(field.table, ['id']);
            _.set(appLib.lookupFieldsMeta, [schemaName, fieldName], treeSelectorTables);

            _.each(treeSelectorTables, (tableLookup, tableName) => {
              const lookupPathsMeta =
                _.get(appLib.labelFieldsMeta, [tableName, tableLookup.label]) || [];
              lookupPathsMeta.push({
                scheme: schemaName,
                path: fieldName, // may be nested
                isMultiple: true, // TreeSelector is always array of LookupObjectID
                fieldType: field.type,
                required: field.required,
                requireLeafSelection: tableLookup.requireLeafSelection,
                foreignKey: tableLookup.foreignKey,
              });
              _.set(appLib.labelFieldsMeta, [tableName, tableLookup.label], lookupPathsMeta);
            });
          }
        });
      });
    }

    /**
     * Merges the defaults set in the typeDefaults and subtypeDefaults into the appModel part
     * @param part
     */
    function mergeTypeDefaults(part) {
      part.type = _.get(part, 'type', appLib.appModel.metaschema.type.default);
      const defaults = _.get(appLib.appModel, ['typeDefaults', 'fields', part.type], {});

      function doNotOverwrite(objValue, srcValue) {
        // objValue is the target value, see https://lodash.com/docs/4.17.10#mergeWith
        if (_.isArray(objValue) && _.isArray(srcValue)) {
          return srcValue.concat(objValue);
        }
        if (_.isString(objValue) && _.isArray(srcValue)) {
          return srcValue.concat([objValue]);
        }
        if (typeof objValue === 'undefined') {
          return _.cloneDeep(srcValue);
        }
        if (srcValue == null || objValue == null) {
          return null;
        }
        if (_.isString(srcValue) && _.isString(objValue)) {
          return objValue;
        }
        return _.mergeWith(objValue, srcValue, doNotOverwrite);
        // return objValue;
      }

      _.mergeWith(part, defaults, doNotOverwrite);
      if (_.has(part, 'subtype')) {
        const subtypeDefaults = _.get(
          appLib.appModel,
          `subtypeDefaults.fields.${part.subtype}`,
          {}
        );
        _.mergeWith(part, subtypeDefaults, doNotOverwrite);
        // _.merge(part, defaults);
      }
    }

    /**
     * Converts transformer definition consisting of just one string into one-element array
     * @param part
     */
    function convertTransformersToArrays(part) {
      if (_.has(part, 'transform')) {
        if (!_.isArray(part.transform)) {
          part.transform = [part.transform];
        }
      }
    }

    /**
     * Converts transformer definition consisting of just one string into one-element array
     * @param part
     */
    function convertSynthesizersToArrays(part) {
      if (_.has(part, 'synthesize')) {
        if (!_.isArray(part.synthesize)) {
          part.synthesize = [part.synthesize];
        }
      }
    }

    /**
     * Validates format and field presence for defaultSortBy attribute
     * @param part
     * @param path
     */
    function validateDefaultSortBy(part, path) {
      if (_.has(part, 'defaultSortBy')) {
        if (typeof part.defaultSortBy !== 'object') {
          errors.push(`defaultSortBy in ${path.join('.')} has incorrect format, must be an object`);
        } else {
          _.each(part.defaultSortBy, (val, key) => {
            if (val !== -1 && val !== 1) {
              errors.push(
                `defaultSortBy in ${path.join(
                  '.'
                )} has incorrect format, the sorting order must be either 1 or -1`
              );
            }
            if (!_.has(part.fields, key) && key !== '_id') {
              errors.push(
                `defaultSortBy in ${path.join('.')} refers to nonexisting field "${key}"`
              );
            }
          });
        }
      }
    }

    /**
     * Uses validatorShortcuts to expand validators into full form
     * @param part
     * @param path
     */
    function expandValidators(part, path) {
      if (_.has(part, 'validate')) {
        if (typeof part.validate === 'string') {
          part.validate = [part.validate];
        }
        part.validate = _.map(part.validate, handler => {
          /* eslint-disable security/detect-unsafe-regex */
          const matches = _.isString(handler)
            ? handler.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(\((.*)\))?$/)
            : null;
          let handlerSpec;
          if (matches) {
            const handlerName = matches[1];
            const matchedArguments = matches[3] ? matches[3].split(',') : [];
            if (appLib.appModel.validatorShortcuts[handlerName]) {
              handlerSpec = {
                validator: handlerName,
                arguments: _.mapValues(
                  appLib.appModel.validatorShortcuts[handlerName].arguments,
                  o => o.replace(/\$(\d+)/g, (match, p1) => matchedArguments[parseInt(p1, 10) - 1])
                ),
                errorMessages: appLib.appModel.validatorShortcuts[handlerName].errorMessages,
              };
            } else {
              errors.push(`No validator shortcut is provided for validator ${handlerName}`);
            }
          } else if (typeof handler === 'object' && handler.validator) {
            handlerSpec = handler;
          } else {
            errors.push(
              `Unable to expand validator ${JSON.stringify(handler)} for ${path.join('.')}`
            );
          }
          return handlerSpec;
        });
        // make sure all validators exist
        _.each(part.validate, val => {
          if (_.get(val, 'validator') && !_.has(appLib.appModelHelpers.Validators, val.validator)) {
            errors.push(`Validator "${val.validator}" doesn't exist in ${path.join('.')}`);
          }
        });
      }
    }

    /**
     * Converts values like "true" and "false" into booleans for attributes accepting boolean values (like "visible" or "required")
     * @param part
     */
    function convertStringsForNonstringAttributes(part) {
      _.each(part, (val, key) => {
        if (
          typeof appLib.appModel.metaschema[key] !== 'undefined' &&
          appLib.appModel.metaschema[key].type === 'Boolean' &&
          _.isString(val)
        ) {
          // part[key] = _.includes(["true", "TRUE", "True", "yes", "YES", "Yes"], val);
        }
      });
    }

    /**
     * Validates that all transformers referred in the model exist
     * @param part
     * @param path
     */
    function makeSureAllTransformersExist(part, path) {
      if (_.has(part, 'transform')) {
        _.each(part.transform, val => {
          if (_.isArray(val)) {
            if (!_.has(appLib.appModelHelpers.Transformers, val[0])) {
              errors.push(`Transformer "${val[0]}" doesn't exist in ${path.join('.')}`);
            }
            if (!_.has(appLib.appModelHelpers.Transformers, val[1])) {
              errors.push(`Transformer "${val[1]}" doesn't exist in ${path.join('.')}`);
            }
            if (val.length > 2) {
              errors.push(
                `Transformer "${val}" doesn't look right in ${path.join(
                  '.'
                )} (if array then must contain only two elements)`
              );
            }
          } else if (!_.has(appLib.appModelHelpers.Transformers, val)) {
            errors.push(`Transformer "${val}" doesn't exist in ${path.join('.')}`);
          }
        });
      }
    }

    function generateLookupId(path) {
      return _(path)
        .difference(['fields'])
        .map(v => _.capitalize(v))
        .value()
        .join('');
    }

    function transformLookupScopes(tableLookup) {
      if (!appLib.getAuthSettings().enablePermissions) {
        return;
      }

      _.each(tableLookup.scopes, scope => {
        if (_.isString(scope.permissions)) {
          const permissionName = scope.permissions;
          scope.permissions = {
            view: permissionName,
          };
        }
      });

      tableLookup.scopes = _.merge(
        tableLookup.scopes,
        appLib.accessUtil.getAdminLookupScopeForViewAction()
      );
    }

    function addForeignKeyType(tableLookup) {
      const { foreignKey } = tableLookup;
      if (foreignKey === '_id') {
        tableLookup.foreignKeyType = 'ObjectID';
      } else {
        tableLookup.foreignKeyType = _.get(
          appLib.appModel.models,
          `${tableLookup.table}.fields.${foreignKey}.type`
        );
      }
    }

    function transformLookups(part, path) {
      const { lookup } = part;

      if (lookup) {
        const tableProp = lookup.table;

        if (_.isString(tableProp)) {
          part.lookup = {
            table: {
              [tableProp]: {
                foreignKey: lookup.foreignKey || '_id',
                label: lookup.label || '_id',
                table: tableProp,
                sortBy: lookup.sortBy,
              },
            },
            id: lookup.id || generateLookupId(path),
          };
        } else if (_.isPlainObject(tableProp)) {
          _.each(tableProp, (tableLookup, tableName) => {
            tableLookup.table = tableName;
          });
          lookup.id = generateLookupId(path);
        }

        _.each(part.lookup.table, tableLookup => {
          transformLookupScopes(tableLookup);
          addForeignKeyType(tableLookup);
        });
      }
    }

    function transformTreeSelectors(part, path) {
      const { type, table } = part;
      if (type !== 'TreeSelector') {
        return;
      }

      if (_.isString(table)) {
        const collectionName = table;
        const pickedFromRoot = _.pick(part, [
          'label',
          'parent',
          'roots',
          'leaves',
          'requireLeafSelection',
          'scopes',
          'prepare',
          'where',
          'sortBy',
        ]);
        part.table = {
          [collectionName]: {
            ...pickedFromRoot,
            table: collectionName,
          },
        };
        // TODO: add transforming to extended version
      } else if (_.isPlainObject(table)) {
        _.each(table, (tableSpec, tableName) => {
          tableSpec.table = tableName;
        });
      }

      part.table.id = part.table.id || generateLookupId(path);

      _.each(part.table, (tableLookup, tableName) => {
        if (tableName === 'id') {
          return;
        }
        transformLookupScopes(tableLookup);
        addForeignKeyType(tableLookup);
      });
    }

    /**
     * Validates lookups format and sets default fields
     * @param part
     * @param path
     */
    function validateLookups(part, path) {
      if (_.has(part, 'lookup')) {
        if (!_.has(part, 'transform')) {
          // if there is transform, it's already an array, see above
          part.transform = [];
        }
        part.transform.push('addLookupDetails');
        if (!part.lookup.table) {
          errors.push(`Lookup in ${path.join('.')} doesn't have property "table"`);
        } else {
          // TODO: use default from metaschema here?
          _.each(part.lookup.table, tableLookup => {
            validateTableLookup(tableLookup);
          });
          validateLookupId(part.lookup);
        }
      }

      // TODO: add support for multiple tables
      function validateTableLookup(tableLookup) {
        const { table: tableName, foreignKey, label } = tableLookup;
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

        if (!appLib.appModel.models[tableName]) {
          tableLookupErrors.push(
            `Lookup in ${path.join('.')} refers to nonexisting collection "${tableName}"`
          );
        } else {
          if (!appLib.appModel.models[tableName].fields[foreignKey] && foreignKey !== '_id') {
            tableLookupErrors.push(
              `Lookup in ${path.join('.')} refers to nonexisting foreignKey "${foreignKey}"`
            );
          }
          if (!appLib.appModel.models[tableName].fields[label] && label !== '_id') {
            tableLookupErrors.push(
              `Lookup in ${path.join('.')} refers to nonexisting label "${label}"`
            );
          }
        }
        errors = errors.concat(tableLookupErrors);
      }

      function validateLookupId(lookup) {
        if (!lookup.id) {
          errors.push(`Lookup in ${path.join('.')} must have 'id' field`);
        }
      }
    }

    /*
    /!**
     * Validates that all schema names are plural - important for mongoose
     * @param part
     * @param path
     *!/
    function validateSchemaNamesArePlural(part, path) {
      if (part.type === 'Schema' && !path[path.length - 1].endsWith('s')) {
        errors.push(`Schema names must be plural in ${path.join('.')}`);
      }
      // add _id field to schemas
      // These are created in the mongoose model implicitly (schemas)
      // so possibly it makes sense to move their creation here
      /!*
      if ('Schema' == part.type) {
          part.fields["_id"] = {
              "type": "ObjectID",
              "visible": false,
              "comment": "Added to implicitly include in all datatables",
              "generated": true,
              "fullName": "Schema element id",
              "description": "Schema element id"
          }
      }
      *!/
    }
*/

    /**
     * fullName is a required attribute, generate it from the key if necessary
     * @param part
     * @param path
     */
    function generateFullName(part, path) {
      const partKey = path[path.length - 1];
      if (appLib.appModel.metaschema.fullName && !part.fullName) {
        // some tests and potentially apps do not have fullName in metaschema
        part.fullName = camelCase2CamelText(partKey);
      }
    }

    /**
     * Validate that all required attributes are in place and set them to defaults if necessary
     * TODO: use context for defaults (see metaschema
     * @param part
     * @param path
     */
    function validateRequiredAttributes(part, path) {
      _.each(appLib.appModel.metaschema, (val, key) => {
        if (val.required && !_.has(part, key)) {
          errors.push(`Attribute ${path.join('.')} doesn't have required property "${key}"`);
        }
      });
    }

    function addValidatorForConditionalRequired(part) {
      // TODO: move to config? Add support for other conditional booleans, not only 'required' field?
      const requiredValidator = {
        validator: 'required',
        arguments: {},
        errorMessages: {
          default: 'Field is required',
        },
      };

      if (_.isString(part.required)) {
        if (part.validate) {
          part.validate.push(requiredValidator);
        } else {
          part.validate = [requiredValidator];
        }
      }
    }

    /**
     * Sets certain attributes to defaults where it's difficult to enforce them from metaschema
     * @param part
     */
    function setDefaultAttributes(part) {
      function setAttribute(sPart, attr) {
        const { metaschema } = appLib.appModel;

        if (!_.has(sPart, attr)) {
          const defaultAttr = _.get(metaschema, `${attr}.default`);
          if (defaultAttr !== undefined) {
            sPart[attr] = defaultAttr;
          }
        }
      }

      if (part.type) {
        if (part.type === 'Schema') {
          // setAttribute(part, 'requiresAuthentication'); // depricated, now we use permission 'authenticated'
          setAttribute(part, 'defaultSortBy');
        } else {
          setAttribute(part, 'visible');
          setAttribute(part, 'visibilityPriority');
          setAttribute(part, 'responsivePriority');
          setAttribute(part, 'width');
        }
      }
    }

    function handleVisibleAttribute(part) {
      if (part.type && part.type !== 'Schema') {
        const visible = part.visible === true || part.visible === undefined;

        ['showInDatatable', 'showInViewDetails', 'showInForm', 'showInGraphQL'].forEach(
          showField => {
            const isShowFieldSet = part[showField] !== undefined;
            if (!isShowFieldSet) {
              part[showField] = visible;
            }
          }
        );

        delete part.visible;
      }
    }

    function validateFieldName(path) {
      const lastFieldName = path[path.length - 1];
      const alphanumericOrQuotesRegExp = /^[\w"]+$/;
      if (!alphanumericOrQuotesRegExp.test(lastFieldName)) {
        errors.push(
          `Field '${lastFieldName}' has invalid name: should contain only alphanumeric and quotes. ` +
            `Path: '${path.join('.')}'`
        );
      }
    }

    /**
     * Loads data specified in external file for all metaschema attributes that have supportsExternalData == true
     * @param part
     */
    function loadExternalData(part) {
      _.each(
        _.reduce(
          appLib.appModel.metaschema,
          (res, val, key) => {
            if (val.supportsExternalData) {
              res.push(key);
            }
            return res;
          },
          []
        ),
        reference => {
          if (_.has(part, reference) && typeof part[reference] === 'object') {
            if (
              part[reference].type &&
              part[reference].type === 'file' &&
              typeof part[reference].link === 'string'
            ) {
              const isJson = part[reference].link.endsWith('.json');
              const defaultFilePath = require('path').resolve(
                appRoot,
                `model/private/${part[reference].link}`
              );
              if (fs.existsSync(defaultFilePath)) {
                part[reference] = fs.readFileSync(defaultFilePath, 'utf-8');
              } else {
                part[reference] = fs.readFileSync(
                  `${process.env.APP_MODEL_DIR}/private/${part[reference].link}`,
                  'utf-8'
                );
              }
              if (isJson) {
                part[reference] = JSON.parse(part[reference]);
              }
            }
          }
        }
      );
    }

    function transformActions(part) {
      if (part.type === 'Schema') {
        const actions = _.get(part, 'actions', { fields: {} });
        // delete old disabled actions
        _.each(actions.fields, (val, key) => {
          if (val === false) {
            delete actions.fields[key];
          }
        });
        // inject admin action permission if not exists
        _.each(appLib.accessCfg.DEFAULT_ACTIONS, action => {
          if (!actions.fields[action] || !actions.fields[action].permissions) {
            _.set(
              actions.fields,
              `${action}.permissions`,
              appLib.accessCfg.PERMISSIONS.accessAsSuperAdmin
            );
          }
        });
        part.actions = actions;
      }
    }

    function transformFieldPermissions(part) {
      if (!appLib.getAuthSettings().enablePermissions) {
        return;
      }

      // TODO: validate field permissions and throw error on invalid
      const { permissions } = part;
      const isValidType = part.type !== 'Schema' && part.type !== 'Group';
      const isVisible = part.visible === true || part.visible === undefined;
      if (!permissions && isValidType && isVisible) {
        const { accessAsAnyone } = appLib.accessCfg.PERMISSIONS;
        part.permissions = {
          view: accessAsAnyone,
          create: accessAsAnyone,
          update: accessAsAnyone,
        };
      } else if (_.isString(permissions) || _.isArray(permissions)) {
        part.permissions = {
          view: permissions,
          create: permissions,
          update: permissions,
        };
      } else if (_.isPlainObject(permissions)) {
        const { accessAsSuperAdmin } = appLib.accessCfg.PERMISSIONS;

        const { read, write } = permissions;
        const readPermission = read || accessAsSuperAdmin;
        const writePermission = write || accessAsSuperAdmin;

        part.permissions = {
          view: readPermission,
          create: writePermission,
          update: writePermission,
          delete: writePermission,
        };
      }
    }

    /**
     * Removes all disabled menu items
     * @param part
     */
    function deleteDisabledMenuItems(part) {
      if (part.type === 'Menu' && part.fields) {
        _.each(part.fields, (val, key) => {
          if (val === false) {
            delete part.fields[key];
          }
        });
      }
    }

    /**
     * Collects all permission names for future validation with models
     * @param part
     * @param path
     */
    function collectUsedPermissionNames(part, path) {
      if (!appLib.appModel.usedPermissions) {
        appLib.appModel.usedPermissions = new Set();
      }
      // According to 'Attaching Permissions' https://confluence.conceptant.com/pages/viewpage.action?pageId=1016055
      // There are many places where permissions are used

      // schema, list scopes
      addPermissionsFromScopes(part);

      // schema actions
      const actionFields = _.get(part, 'actions.fields');
      _.each(actionFields, val => {
        const actionPermissions = _.get(val, 'permissions');
        addToUsedPermissions(actionPermissions);
      });

      // add lookup scopes
      if (part.type.startsWith('LookupObjectID')) {
        const lookups = _.get(part, 'lookup.table');
        _.each(lookups, lookup => {
          addPermissionsFromScopes(lookup);
        });
      }

      // add fields permissions
      if (part.permissions) {
        addToUsedPermissions(part.permissions);
      }

      function addPermissionsFromScopes(aPart) {
        const scopeFields = _.get(aPart, 'scopes');
        _.each(scopeFields, scopeObj => {
          const scopePermissions = _.get(scopeObj, 'permissions');
          addToUsedPermissions(scopePermissions);
        });
      }

      function addToUsedPermissions(permissions) {
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
              errors.push(
                `Found permission with not String type. Permission: ${permission}, path: ${path}`
              );
            }
          });
        } else if (_.isPlainObject(permissions)) {
          _.each(permissions, objPermission => {
            addToUsedPermissions(objPermission);
          });
        }
      }
    }

    /**
     * Validates list format and checks that referred list exists in appModelHelpers.Lists
     * Add dynamic list validator if necessary
     * Note: there is another check when Mongoose model is being beuilt, delete this one?
     * @param part
     * @param path
     */
    function validateLists(part, path) {
      const { list } = part;
      if (!list) {
        return;
      }

      if (_.isPlainObject(list)) {
        const listName = list.name;
        const listVal = list.values;
        const listValByName = _.get(appLib.appModelHelpers, ['Lists', listName]);

        if (listValByName && listVal) {
          errors.push(
            `Attribute ${_.concat(path, 'list').join(
              '.'
            )} must have only one source of values for list (either 'name' or 'values')`
          );
        } else if (_.isString(listValByName)) {
          if (_.has(part, 'validate')) {
            if (_.isString(part.validate)) {
              part.validate = [part.validate];
            }
            part.validate.push('dynamicListValue');
          } else {
            part.validate = ['dynamicListValue'];
          }
        } else if (!_.isPlainObject(listValByName || listVal)) {
          errors.push(
            `Attribute ${_.concat(path, 'list').join(
              '.'
            )} must have list values(inlined or referenced) represented as object`
          );
        }
      } else {
        errors.push(
          `Attribute ${_.concat(path, 'list').join('.')} after transformation must be an object.`
        );
      }
    }

    /**
     * Recursively processes all fields in the part
     * @param validator
     * @param part
     * @param path
     */
    function validateFields(validator, part, path) {
      if (_.has(part, 'fields')) {
        validator(part.fields, _.concat(path, 'fields'));
      }
    }

    // These validators are called for all fields in the schema -----------------

    /**
     * Deletes all attributes "comment" from the app model
     * @param part
     * @param path
     * @param val
     * @param key
     */
    function deleteComments(part, path, val, key) {
      if (_.includes(['comment'], key)) {
        delete part[key];
      }
    }

    /**
     * If metaschema has list of allowed values for given field then validate that the app model attribute value is in that list
     * @param part
     * @param path
     * @param val
     * @param key
     */
    function validateValuesAreAllowedInMetaschema(part, path, val, key) {
      if (
        appLib.appModel.metaschema[key] &&
        _.has(appLib.appModel.metaschema[key], 'list') &&
        !_.includes(appLib.appModel.metaschema[key].list, val)
      ) {
        // value is allowed in metaschema
        errors.push(`Invalid value ${val} for ${_.concat(path, key).join('.')}`);
      }
    }

    /**
     * Validates that the attribute is allowed in metaschema
     * @param part
     * @param path
     * @param val
     * @param key
     */
    function validateAttributeAllowed(part, path, val, key) {
      if (!_.includes(allowedAttributes, key)) {
        // attribute of app model is listed in metadata
        errors.push(`Unknown attribute ${_.concat(path, key).join('.')}`);
      }
    }

    // recursive validation code -----------------------

    function handlePermissions() {
      // if (!appLib.getAuthSettings().enablePermissions) {
      //   log.trace(`Flag enablePermissions is disabled, handling app permissions is skipped.`);
      //   return;
      // }

      // TODO: move to validateModelParts?
      transformPermissions();
      validatePermissions();
    }

    function transformPermissions() {
      const appPermissions = _.get(appLib.appModel, 'interface.app.permissions');
      const newAppPermissions = getTransformedInterfaceAppPermissions(appPermissions, errors);
      newAppPermissions && _.set(appLib.appModel, 'interface.app.permissions', newAppPermissions);

      const transformedAppModel = getAppModelWithTransformedPermissions(
        appLib.appModel.models,
        appLib.accessCfg.DEFAULT_ACTIONS
      );
      _.set(appLib.appModel, 'models', transformedAppModel);

      transformListPermissions(appLib.ListsPaths, appLib.appModel.models);

      const mainMenuItems = _.get(appLib, 'appModel.interface.mainMenu.fields');
      transformMenuPermissions(mainMenuItems, appLib.accessCfg.DEFAULT_ACTIONS);

      const pages = _.get(appLib, 'appModel.interface.pages.fields');
      transformPagesPermissions(pages, appLib.accessCfg.DEFAULT_ACTIONS);
    }

    function validatePermissions() {
      if (!appLib.getAuthSettings().enablePermissions) {
        log.trace(`Flag enablePermissions is disabled, handling app permissions is skipped.`);
        return;
      }

      // should be created in method collectUsedPermissionNames
      if (!appLib.appModel.usedPermissions) {
        const errMsg = `Used permissions are not preloaded`;
        log.error(errMsg);
        throw new Error(errMsg);
      }

      const declaredPermissions = _.get(appLib.appModel, 'interface.app.permissions', {});

      for (const usedPermissionName of appLib.appModel.usedPermissions.values()) {
        if (declaredPermissions[usedPermissionName] === undefined) {
          errors.push(
            `Permission with name '${usedPermissionName}' is used but not declared in interface.app.permissions.`
          );
        }
      }

      for (const declaredPermissionName of _.keys(declaredPermissions)) {
        if (!appLib.appModel.usedPermissions.has(declaredPermissionName)) {
          log.warn(
            `Permission with name '${declaredPermissionName}' is declared in interface.app.permissions but not used.`
          );
        }
      }
    }

    function setAppAuthSettings() {
      const authSettings = _.get(appLib.appModel, 'interface.app.auth', {});
      const defaultAuthSettings = _.get(appLib, 'accessCfg.DEFAULT_AUTH_SETTINGS', {});
      const mergedSettings = _.merge({}, defaultAuthSettings, authSettings);

      if (mergedSettings.requireAuthentication && !mergedSettings.enableAuthentication) {
        log.warn(
          `Found contradictory settings: app.auth.requireAuthentication is true and app.auth.enableAuthentication is false.\n` +
            `app.auth.enableAuthentication will be set to true.`
        );
        mergedSettings.enableAuthentication = true;
      }
      _.set(appLib.appModel, 'interface.app.auth', mergedSettings);
    }

    /**
     * Needed for dispatching list values of all models with considering scope conditions
     * @param part
     * @param path
     */
    function collectListsMetaInfo(part, path) {
      if (!appLib.ListsPaths) {
        appLib.ListsPaths = [];
        appLib.ListsFields = [];
      }
      if (_.get(part, 'list')) {
        const pathToModelField = path.join('.'); // for example 'roles.fields.permissions'
        appLib.ListsFields.push(pathToModelField);
        appLib.ListsPaths.push(`${pathToModelField}.list`);
      }
    }

    function transformLists(part) {
      if (!part.list) {
        return;
      }

      const adminListScopeForViewAction = appLib.getAuthSettings().enablePermissions
        ? appLib.accessUtil.getAdminListScopeForViewAction()
        : {};

      if (_.isString(part.list)) {
        // transform to object
        const listName = part.list;
        part.list = {
          name: listName,
          scopes: adminListScopeForViewAction,
        };
      } else if (_.isPlainObject(part.list)) {
        const newFormatListFields = ['name', 'values', 'scopes'];
        const isNewListFormat = _.every(part.list, (field, fieldName) =>
          newFormatListFields.includes(fieldName)
        );

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
      }

      _.each(part.list.scopes, scope => {
        setReturnWhereToListScope(scope);
      });

      function setReturnWhereToListScope(scope) {
        scope.where = scope.where || 'return true';
        scope.return = scope.return || 'return $list';
      }
    }

    function validateModelPart(part, path) {
      mergeTypeDefaults(part, path);
      convertTransformersToArrays(part, path);
      convertSynthesizersToArrays(part, path);
      validateDefaultSortBy(part, path);
      transformLists(part);
      validateLists(part, path);
      collectListsMetaInfo(part, path);
      expandValidators(part, path);
      convertStringsForNonstringAttributes(part, path);
      makeSureAllTransformersExist(part, path);
      transformLookups(part, path);
      validateLookups(part, path);
      transformTreeSelectors(part, path);
      // validateSchemaNamesArePlural(part, path);
      generateFullName(part, path);
      validateRequiredAttributes(part, path);
      addValidatorForConditionalRequired(part);
      setDefaultAttributes(part, path);
      transformActions(part);
      transformFieldPermissions(part);
      collectUsedPermissionNames(part, path);
      handleVisibleAttribute(part, path);
      validateFieldName(path);

      validateFields(validateModelParts, part, path);

      // validate and cleanup individual fields
      _.each(part, (val, key) => {
        validateAttributeAllowed(part, path, val, key);
        validateValuesAreAllowedInMetaschema(part, path, val, key);
        deleteComments(part, path, val, key);
      });
    }

    function validateInterfacePart(part, path) {
      loadExternalData(part, path);

      deleteDisabledMenuItems(part, path);
      validateFields(validateInterfaceParts, part, path);

      // validate and cleanup individual fields
      _.each(part, (val, key) => {
        // validateValuesAreAllowedInMetaschema(part, path, val, key); // fails on dashboards
        deleteComments(part, path, val, key);
      });
    }

    function validateInterfaceParts(parts, path) {
      _.each(parts, (val, key) => {
        validateInterfacePart(val, _.concat(path, key));
      });
    }

    function validateModelParts(parts, path) {
      _.each(parts, (val, key) => {
        validateModelPart(val, _.concat(path, key));
      });
    }
  };

  /**
   * Generates mongoose models based on models JSON and puts them in m.mongooseModels hash
   * Note that some methods require m.mongoos_models to be populated before they work correctly
   * @param db the mongoose db connection
   * @param models JSON defining the model
   * @param cb callback(err)
   */
  m.generateMongooseModels = (db, models) =>
    Promise.map(Object.entries(models), ([name, model]) => {
      const mongooseSchemaDefinition = {};
      m.getMongooseSchemaDefinition(null, model, mongooseSchemaDefinition);
      try {
        const schema = new mongoose.Schema(mongooseSchemaDefinition, {
          collection: name,
          strict: false,
          versionKey: false,
        });

        // create index for actual record condition for production
        if (process.env.DEVELOPMENT !== 'true') {
          schema.index({ deletedAt: 1, _temporary: 1 }, { background: true });
        }

        if (model.schemaTransform) {
          if (typeof model.schemaTransform === 'string') {
            model.schemaTransform = [model.schemaTransform];
          }
          model.schemaTransform.forEach(transformer => {
            schemaTransformers[transformer](schema);
          });
        }
        log.trace(`Generating model ${name}`);
        // log.trace( `Generating model ${name}:\n${JSON.stringify(mongooseSchemaDefinition,null,4)}` );
        return db.model(name, schema);
      } catch (e) {
        log.error('MDL001', `Unable to generate mongoose model ${name}`);
        throw e;
      }
    });

  m.removeIrrelevantUniqueIndexes = collectionName => {
    const collection = appLib.db.collection(collectionName);
    const modelUniqueFields = getModelUniqueFields(collectionName);
    return getRemoveModelIndexesPromise(collection, modelUniqueFields);

    function getRemoveModelIndexesPromise(_collection, _modelUniqueFields) {
      return _collection
        .getIndexes({ full: true })
        .then(indexes =>
          Promise.map(indexes, index => {
            if (index.unique === true) {
              const keyPaths = Object.keys(index.key);
              const isUniqueIndexNotExistsInSchema =
                keyPaths.length === 1 && !_modelUniqueFields.has(keyPaths[0]);
              if (isUniqueIndexNotExistsInSchema) {
                log.info(`Dropping unique index which does not exists in schema: ${index.name}`);
                return _collection.dropIndex(index.name);
              }
            }
          })
        )
        .catch(err => {
          if (err.codeName === 'NamespaceNotFound') {
            // collections does not exist, so skip removing unique indexes
            return;
          }
          log.info(`Error occurred while removing unique indexes for collection '${_collection}'`);
          throw err;
        });
    }

    function getModelUniqueFields(modelName, uniqueFieldPaths = new Set(), curPath = []) {
      const curAppModel = appLib.appModel.models[modelName];
      if (!curAppModel) {
        return uniqueFieldPaths;
      }
      const curObj = _.isEmpty(curPath) ? curAppModel : _.get(curAppModel, curPath);
      if (curObj.unique === true) {
        const indexPath = curPath.filter(part => part !== 'fields').join('.');
        uniqueFieldPaths.add(indexPath);
      }
      _.each(curObj.fields, (field, fieldName) => {
        const nestedPath = curPath.concat('fields', fieldName);
        getModelUniqueFields(modelName, uniqueFieldPaths, nestedPath);
      });
      return uniqueFieldPaths;
    }
  };

  m.handleIndexes = () => {
    const collectionNames = Object.keys(appLib.appModel.models);

    return Promise.mapSeries(collectionNames, collectionName =>
      // log.info(`Handling indexes for collection '${collectionName}'`);
      m.removeIrrelevantUniqueIndexes(collectionName)
    );
  };

  return m;
};
