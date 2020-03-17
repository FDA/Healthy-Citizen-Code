/**
 * @module model-util
 * This module provides utilities shared between multiple applications and allows models manipulation for
 * Conceptant applications.
 */

const log = require('log4js').getLogger('lib/model');
const mongoose = require('mongoose');
const fs = require('fs-extra');
const _ = require('lodash');
const appRoot = require('app-root-path').path;
const Promise = require('bluebird');

const { Schema } = mongoose;
const {
  getItemPathByFullModelPath,
  getJsonPathByFullModelPath,
  getMongoPathByFullModelPath,
  getBeforeAndAfterLastArrayPath,
  camelCase2CamelText,
} = require('./util/util');
const schemaTransformers = require('./schema-transformers')();
const {
  getTransformedInterfaceAppPermissions,
  getAppModelWithTransformedPermissions,
  transformListPermissions,
  transformMenuPermissions,
  transformPagesPermissions,
  expandPermissionsForScopes,
} = require('./access/transform-permissions');
const { combineModels } = require('./util/model');
const { getSchemaPaths, getSchemaNestedPaths } = require('./util/env');

module.exports = appLib => {
  const m = {};

  function ObjectIdOrScalar(key, options) {
    mongoose.SchemaType.call(this, key, options, 'ObjectIdOrScalar');
  }

  ObjectIdOrScalar.prototype = Object.create(mongoose.SchemaType.prototype);

  ObjectIdOrScalar.prototype.cast = val => {
    if (!_.isNumber(val) && !_.isString(val) && !_.isBoolean(val) && !(_.get(val, 'constructor.name') === 'ObjectID')) {
      throw new Error(`${val} is not an objectId instance or scalar type`);
    }
    return val;
  };

  const mongooseTypes = mongoose.Schema.Types;
  mongooseTypes.ObjectIdOrScalar = ObjectIdOrScalar;
  const LookupObjectIDSchema = new Schema({
    _id: ObjectIdOrScalar,
    table: String,
    label: String,
    data: mongooseTypes.Mixed,
  });

  /**
   * Maps HC schema master file types to mongoose types
   * @enum {Object}
   */
  m.mongooseTypesMapping = {
    String,
    Html: String,
    Date,
    Number,
    Double: Number,
    Int32: Number,
    Int64: Number,
    Decimal128: mongooseTypes.Decimal128,
    Boolean,
    Mixed: mongooseTypes.Mixed,
    ObjectID: mongooseTypes.ObjectId,
    LookupObjectID: LookupObjectIDSchema,
    TreeSelector: [LookupObjectIDSchema],
    'String[]': [String],
    'Date[]': [Date],
    'Number[]': [Number],
    'Double[]': [Number],
    'Int32[]': [mongooseTypes.Int32],
    'Int64[]': [mongooseTypes.Long],
    'Decimal128[]': [mongooseTypes.Decimal128],
    'Boolean[]': [Boolean],
    'Mixed[]': [mongooseTypes.Mixed],
    'Object[]': [mongooseTypes.Mixed],
    'ObjectID[]': [mongooseTypes.ObjectId],
    'LookupObjectID[]': [LookupObjectIDSchema],
    // the following fields will only contain file names
    Image: [mongooseTypes.Mixed],
    Video: [mongooseTypes.Mixed],
    Audio: [mongooseTypes.Mixed],
    File: [mongooseTypes.Mixed],
    'Image[]': [mongooseTypes.Mixed],
    'Video[]': [mongooseTypes.Mixed],
    'Audio[]': [mongooseTypes.Mixed],
    'File[]': [mongooseTypes.Mixed],
    Location: new Schema(
      {
        type: { type: String, default: 'Point' },
        coordinates: {
          type: [Number],
        },
        label: String,
      },
      { _id: false }
    ),
    // ex-subtypes
    Password: String,
    Email: String,
    Phone: String,
    Url: String,
    Text: String,
    ImperialHeight: Number,
    ImperialWeight: Number,
    ImperialWeightWithOz: Number,
    BloodPressure: Number,
    Time: Date,
    DateTime: Date,
    Barcode: String,
  };

  /**
   * Combines all files passed to appModelSources into a single JSON representing the master schema
   * Merge is done with respect of appModelSources elements order.
   * Elements of appModelSources can be of 2 types: string or object.
   * If element is a string it will be handled as globby pattern
   * and will be expanded to array of json files being parsed to objects.
   * @returns {Object} JSON containing the master model
   * @param appModelSources - array contains globby patterns or JS objects
   * @param macrosData - data passed to ejs functions
   * @param macrosDirPaths - dirs in which a search of .ejs files is performed
   */
  m.getCombinedModel = ({ appModelSources, appModelProcessors, macrosDirPaths } = {}) => {
    let modelSources = [`${appRoot}/model/model/**/*.json`];
    if (!appModelSources) {
      modelSources.push(...getSchemaNestedPaths('model/**/*.json'));
    } else if (_.isArray(appModelSources)) {
      modelSources = modelSources.concat(appModelSources);
    } else {
      throw new Error(`appModelSources must be an array, got: ${appModelSources}`);
    }

    return combineModels({ modelSources, log: log.trace.bind(log), appModelProcessors, macrosDirPaths });
  };

  // Generating the mongoose model -------------------------------------------------------------

  /**
   * Gets complete mongoose-compatible schema definition based on JSON application model
   * @param {string} name name of the conceptant JSON element to generate mongoose schema definition for
   * @param {Object} obj - conceptant JSON element top generate mongoose schema for
   * @param {Object} mongooseModel mongoose equivalent of the model will go into this parameter
   */
  m.getMongooseSchemaDefinition = (name, obj, mongooseModel) => {
    const { type, fields } = obj;
    if (type === 'Group') {
      return;
    }

    if (type === 'Schema') {
      fields.deletedAt.default = new Date(0);
      fields.generatorBatchName = {
        type: 'String',
        showInDatatable: false,
        showInViewDetails: false,
        showInForm: false,
        showInGraphql: false,
        // "comment": "Do not set this to anything for real records, they may get wiped out as autogenerated otherwise", // this will be eliminated by backed
        generated: true,
        fullName: 'Generator Batch Name',
        description: 'Set to the ID of generator batch for synthetic records',
        generatorSpecification: {
          generator: 'scgGeneratorBatchName',
        },
      };
      for (const field in fields) {
        if (_.has(fields, field)) {
          m.getMongooseSchemaDefinition(field, fields[field], mongooseModel);
        }
      }
    } else if (type === 'Object') {
      mongooseModel[name] = {};
      for (const field in fields) {
        if (_.has(fields, field)) {
          m.getMongooseSchemaDefinition(field, fields[field], mongooseModel[name]);
        }
      }
    } else if (type === 'Array') {
      mongooseModel[name] = [{}];
      for (const field in fields) {
        if (_.has(fields, field)) {
          m.getMongooseSchemaDefinition(field, fields[field], mongooseModel[name][0]);
        }
      }
    } else if (type === 'AssociativeArray') {
      mongooseModel[name] = {};
      for (const field in fields) {
        if (_.has(fields, field)) {
          m.getMongooseSchemaDefinition(field, fields[field], mongooseModel[name]);
        }
      }
      const schemaWithoutId = new Schema(mongooseModel[name], { _id: false });
      mongooseModel[name] = {
        type: Map,
        of: schemaWithoutId,
      };
    } else {
      mongooseModel[name] = { type: m.mongooseTypesMapping[type] };

      if (name === '_id' && type === 'ObjectID') {
        // autogenerate _id
        mongooseModel[name].auto = true;
      }

      if (obj.default) {
        mongooseModel[name].default = obj.default;
      }

      setMongooseIndexesByScheme(obj, mongooseModel, name);

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
     * @param fieldName
     */
    function setMongooseIndexesByScheme(schemeField, model, fieldName) {
      const mongooseField = model[fieldName];
      if (schemeField.unique) {
        mongooseField.unique = schemeField.unique;
      }

      // do not generate other indexes(not unique) for tests,
      // since it affects only search speed and consume time and disk space
      if (process.env.CREATE_INDEXES !== 'true') {
        return;
      }

      if (schemeField.index) {
        mongooseField.index = schemeField.index;
      }

      const lookupTypes = ['LookupObjectID', 'LookupObjectID[]', 'TreeSelector'];
      // index speedups updateLinkedRecords
      const schemeType = schemeField.type;
      if (lookupTypes.includes(schemeType)) {
        // considering single or array types mongoose
        const mongooseType = mongooseField.type;
        const index = { _id: 1, table: 1 };
        const singleType = _.isArray(mongooseType) ? mongooseType[0] : mongooseType;
        const isIndexAlreadySet = singleType._indexes.find(([indexSpec]) => _.isEqual(indexSpec, index));
        if (!isIndexAlreadySet) {
          singleType.index(index, { background: true });
        }
      }

      if (schemeType === 'Location') {
        mongooseField.index = '2dsphere';
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
          const nestedFieldsErrors = getFieldsErrors(field, _.concat(path, fieldName), isFieldRequired);
          fieldsErrors.push(...nestedFieldsErrors);
        }
      });
      if (!isPartHasRequiredFields && hasRequiredParent) {
        fieldsErrors.push(`Model part by path '${path.join('.')}' is required but doesn't have any required field`);
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
    initLookupAndTreeSelectorMeta();
    validateModelParts(appLib.appModel.models, []);
    setLookupFieldsMeta();
    handlePermissions();
    const requiredWarnings = m.validateRequiredFields(appLib.appModel.models);
    warnings.push(...requiredWarnings);

    if (appLib.appModel.interface) {
      validateInterfaceParts(appLib.appModel.interface, []); // TODO: add test for this
      _.each(['loginPage', 'charts', 'pages'], interfacePart => {
        if (appLib.appModel.interface[interfacePart]) {
          validateInterfaceParts(appLib.appModel.interface[interfacePart], [interfacePart]);
        }
      });
    }
    return { errors, warnings };

    // These validators are called for specific part of the model (vs all attributes of the part, see below) -----

    function initLookupAndTreeSelectorMeta() {
      appLib.appLookups = {}; // model LookupObjectID and LookupObjectID[] will be stored here by id
      appLib.appTreeSelectors = {}; // model TreeSelectors will be stored here by id
      // used to validate lookup and transform lookup._id sent from frontend as String to ObjectID.
      appLib.treeSelectorFieldsMeta = {};
      appLib.lookupObjectIdFieldsMeta = {};
      // used to update linked labels when original record is changed
      appLib.labelFieldsMeta = {};
      // used to validate uniqueness of lookup ids
      appLib.lookupIds = {};
    }

    function setLookupFieldsMeta() {
      appLib.lookupFieldsMeta = _.merge({}, appLib.treeSelectorFieldsMeta, appLib.lookupObjectIdFieldsMeta);
    }

    /** Function that changes old format of something to new format of something
     *  Further old format should not be supported completely.
     * */
    function transformForBackwardCompatibility(part) {
      if (part.showInGraphQL) {
        part.showInGraphql = part.showInGraphQL;
        delete part.showInGraphQL;
      }
    }

    /**
     * Merges the defaults set in the typeDefaults and subtypeDefaults into the appModel part
     * @param part
     */
    function mergeTypeDefaults(part) {
      part.type = _.get(part, 'type', appLib.appModel.metaschema.type.default);
      const defaults = _.get(appLib.appModel, ['typeDefaults', 'fields', part.type], {});
      _.mergeWith(part, defaults, doNotOverwrite);
      if (_.has(part, 'subtype')) {
        const subtypeDefaults = _.get(appLib.appModel, `subtypeDefaults.fields.${part.subtype}`, {});
        _.mergeWith(part, subtypeDefaults, doNotOverwrite);
        // _.merge(part, defaults);
      }

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
    }

    function addSchemeNameOrFieldName(part, path) {
      const key = path[path.length - 1];
      if (part.type === 'Schema') {
        part.schemaName = key;
      } else {
        part.fieldName = key;
      }
    }

    /**
     * Converts transformer definition consisting of just one string into one-element array
     * @param part
     */
    function convertTransformersToArrays(part) {
      if (part.transform === null) {
        delete part.transform;
        return;
      }

      if (_.isString(part.transform)) {
        part.transform = [part.transform];
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
                `defaultSortBy in ${path.join('.')} has incorrect format, the sorting order must be either 1 or -1`
              );
            }
            if (!_.has(part.fields, key) && key !== '_id') {
              errors.push(`defaultSortBy in ${path.join('.')} refers to nonexisting field "${key}"`);
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
          const matches = _.isString(handler) ? handler.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(\((.*)\))?$/) : null;
          let handlerSpec;
          if (matches) {
            const handlerName = matches[1];
            const matchedArguments = matches[3] ? matches[3].split(',') : [];
            if (appLib.appModel.validatorShortcuts[handlerName]) {
              handlerSpec = {
                validator: handlerName,
                arguments: _.mapValues(appLib.appModel.validatorShortcuts[handlerName].arguments, o =>
                  o.replace(/\$(\d+)/g, (match, p1) => matchedArguments[parseInt(p1, 10) - 1])
                ),
                errorMessages: appLib.appModel.validatorShortcuts[handlerName].errorMessages,
              };
            } else {
              errors.push(`No validator shortcut is provided for validator ${handlerName}`);
            }
          } else if (typeof handler === 'object' && handler.validator) {
            handlerSpec = handler;
          } else {
            errors.push(`Unable to expand validator ${JSON.stringify(handler)} for ${path.join('.')}`);
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
      expandPermissionsForScopes(tableLookup.scopes, ['view']);
      tableLookup.scopes = _.merge(tableLookup.scopes, appLib.accessUtil.getAdminLookupScopeForViewAction());
    }

    function transformLookupLabels(tableLookup) {
      const { label } = tableLookup;
      tableLookup.label = label.includes('this.') ? label : `this.${label}`;
    }

    function transformLookupSortBy(tableLookup) {
      const defaultSortBy = _.get(appLib.appModel.metaschema, `defaultSortBy.default`);

      if (!tableLookup.sortBy) {
        tableLookup.sortBy = defaultSortBy;
      }
    }

    function addForeignKeyType(tableLookup) {
      const { foreignKey } = tableLookup;
      if (foreignKey === '_id') {
        tableLookup.foreignKeyType = 'ObjectID';
      } else {
        tableLookup.foreignKeyType = _.get(appLib.appModel.models, `${tableLookup.table}.fields.${foreignKey}.type`);
      }
    }

    function addSourceTable(tableLookup, sourceTable) {
      tableLookup.sourceTable = sourceTable;
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
                data: lookup.data,
                scopes: lookup.scopes,
              },
            },
            id: lookup.id || generateLookupId(path),
          };
        } else if (_.isPlainObject(tableProp)) {
          _.each(tableProp, (tableLookup, tableName) => {
            tableLookup.table = tableName;
            tableLookup.label = tableLookup.label || '_id';
          });
          lookup.id = lookup.id || generateLookupId(path);
        }

        const sourceTable = path[0];
        _.each(part.lookup.table, tableLookup => {
          transformLookupScopes(tableLookup);
          transformLookupLabels(tableLookup);
          transformLookupSortBy(tableLookup);
          addForeignKeyType(tableLookup);
          addSourceTable(tableLookup, sourceTable);
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
          'data',
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
            label: pickedFromRoot.label || '_id',
            table: collectionName,
          },
        };
      } else if (_.isPlainObject(table)) {
        _.each(table, (tableSpec, tableName) => {
          tableSpec.table = tableName;
          tableSpec.label = tableSpec.label || '_id';
        });
      }

      part.table.id = part.table.id || generateLookupId(path);

      const sourceTable = path[0];
      _.each(part.table, (tableLookup, tableName) => {
        if (tableName === 'id') {
          return;
        }
        transformLookupScopes(tableLookup);
        transformLookupLabels(tableLookup);
        transformLookupSortBy(tableLookup);
        addForeignKeyType(tableLookup);
        addSourceTable(tableLookup, sourceTable);
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
        if (!part.lookup.table) {
          errors.push(`Lookup in ${path.join('.')} doesn't have property "table"`);
        } else {
          _.each(part.lookup.table, tableLookup => {
            validateTableLookup(tableLookup);
          });
          validateLookupId(part.lookup, path);
        }
      }

      function validateTableLookup(tableLookup) {
        const { table: tableName, foreignKey, label } = tableLookup;
        const tableLookupErrors = [];

        const pathStr = path.join('.');
        if (!tableName) {
          tableLookupErrors.push(`Lookup in ${pathStr} must have 'table' field`);
        }
        if (!foreignKey) {
          tableLookupErrors.push(`Lookup in ${pathStr} must have 'foreignKey' field`);
        }
        if (!label) {
          tableLookupErrors.push(`Lookup in ${pathStr} must have 'label' field`);
        }
        if (!_.isEmpty(tableLookupErrors)) {
          errors = errors.concat(tableLookupErrors);
          return;
        }

        const model = appLib.appModel.models[tableName];
        if (!model) {
          tableLookupErrors.push(`Lookup in ${pathStr} refers to nonexisting collection "${tableName}"`);
        } else {
          if (!model.fields[foreignKey] && foreignKey !== '_id') {
            tableLookupErrors.push(`Lookup in ${pathStr} refers to nonexisting foreignKey "${foreignKey}"`);
          }

          const fieldsInLabel = (label.match(/this\.\w+/gi) || []).map(s => s.replace('this.', ''));
          const missedFields = fieldsInLabel.reduce((res, fieldInLabel) => {
            if (!model.fields[fieldInLabel]) {
              res.push(fieldInLabel);
            }
            return res;
          }, []);

          if (missedFields.length) {
            const missed = missedFields.join(', ');
            tableLookupErrors.push(`Lookup label "${label}" in ${pathStr} uses nonexisting fields: "${missed}"`);
          }
        }
        errors = errors.concat(tableLookupErrors);
      }

      function validateLookupId(lookup) {
        const joinedPath = path.join('.');
        const lookupId = lookup.id;
        if (!lookupId) {
          errors.push(`Lookup in '${joinedPath}' must have 'id' field`);
        }

        if (appLib.lookupIds[lookupId]) {
          errors.push(
            `Lookup id '${lookupId}' in '${joinedPath}' is already used for path '${appLib.lookupIds[lookupId]}'. It must be unique.`
          );
        }
        appLib.lookupIds[lookupId] = joinedPath;
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
     * Validate that all required attributes are in place
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
          setAttribute(part, 'responsivePriority');
          setAttribute(part, 'width');
        }
      }
    }

    function handleVisibleAttribute(part) {
      if (part.type && part.type !== 'Schema') {
        const visible = part.visible === true || part.visible === undefined;

        ['showInDatatable', 'showInViewDetails', 'showInForm', 'showInGraphql'].forEach(showField => {
          const isShowFieldSpecified = part[showField] !== undefined;
          if (!isShowFieldSpecified) {
            part[showField] = visible;
          }
        });

        delete part.visible;
      }
    }

    function handleOrderAttribute(part, path) {
      if (part.type && part.type !== 'Schema') {
        const { order } = part;
        if (order === undefined) {
          return;
        }
        if (!_.isNumber(order)) {
          return errors.push(`Attribute 'order' must be a number for path '${path.join('.')}'`);
        }

        ['formOrder', 'datagridOrder', 'detailedViewOrder'].forEach(orderField => {
          const isOrderFieldSpecified = part[orderField] !== undefined;
          if (!isOrderFieldSpecified) {
            part[orderField] = order;
          }
        });
        delete part.order;
      }
    }

    function addLookupMeta(part, path) {
      if (part.type.startsWith('LookupObjectID')) {
        const itemPath = getItemPathByFullModelPath(path);
        const { schemeName, jsonPath } = getJsonPathByFullModelPath(appLib.appModel.models, path);
        const { mongoPath } = getMongoPathByFullModelPath(appLib.appModel.models, path);
        const { beforeArrPath, afterArrPath } = getBeforeAndAfterLastArrayPath(mongoPath);
        const paths = {
          itemPath,
          jsonPath,
          mongoPath,
          beforeArrPath,
          afterArrPath,
          modelPath: path,
        };

        _.set(appLib.lookupObjectIdFieldsMeta, [schemeName, itemPath], {
          table: part.lookup.table,
          paths,
        });

        // create labelFieldsMeta to update lookupTables during updating label part
        _.each(part.lookup.table, (tableLookup, tableName) => {
          const lookupPathsMeta = _.get(appLib.labelFieldsMeta, [tableName, tableLookup.label]) || [];
          lookupPathsMeta.push({
            scheme: schemeName,
            paths,
            isMultiple: part.type.endsWith('[]'), // need this info for updating object or array
            fieldType: part.type,
            required: part.required,
            foreignKey: tableLookup.foreignKey,
            data: tableLookup.data,
          });
          _.set(appLib.labelFieldsMeta, [tableName, tableLookup.label], lookupPathsMeta);
        });
      }

      if (part.type === 'TreeSelector') {
        const itemPath = getItemPathByFullModelPath(path);
        const { schemeName, jsonPath } = getJsonPathByFullModelPath(appLib.appModel.models, path);
        const { mongoPath } = getMongoPathByFullModelPath(appLib.appModel.models, path);
        const { beforeArrPath, afterArrPath } = getBeforeAndAfterLastArrayPath(mongoPath);
        const paths = {
          itemPath,
          jsonPath,
          mongoPath,
          beforeArrPath,
          afterArrPath,
          modelPath: path,
        };

        const treeSelectorTables = _.omit(part.table, ['id']);
        const lookupData = Object.values(treeSelectorTables)[0];
        lookupData.isLeaf = new Function(`return ${lookupData.leaves}`);
        _.set(appLib.treeSelectorFieldsMeta, [schemeName, itemPath], {
          table: treeSelectorTables,
          paths,
        });

        // create labelFieldsMeta to update lookupTables during updating label part
        _.each(treeSelectorTables, (tableLookup, tableName) => {
          const lookupPathsMeta = _.get(appLib.labelFieldsMeta, [tableName, tableLookup.label]) || [];
          lookupPathsMeta.push({
            scheme: schemeName,
            paths,
            isMultiple: true, // TreeSelector is always array of LookupObjectID
            fieldType: part.type,
            required: part.required,
            requireLeafSelection: tableLookup.requireLeafSelection,
            foreignKey: tableLookup.foreignKey,
            data: tableLookup.data,
          });
          _.set(appLib.labelFieldsMeta, [tableName, tableLookup.label], lookupPathsMeta);
        });
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
     * @param path
     */
    function loadExternalData(part, path) {
      const supportsExternalData = _.reduce(
        appLib.appModel.metaschema,
        (res, val, key) => {
          if (val.supportsExternalData) {
            res.push(key);
          }
          return res;
        },
        []
      );
      _.each(supportsExternalData, reference => {
        const ref = _.get(part, reference);
        if (!_.isPlainObject(ref)) {
          return;
        }

        if (ref.type === 'file' && _.isString(ref.link)) {
          const defaultFilePath = require('path').resolve(appRoot, `model/private/${ref.link}`);
          if (fs.existsSync(defaultFilePath)) {
            part[reference] = fs.readFileSync(defaultFilePath, 'utf-8');
          } else {
            const schemaPaths = getSchemaPaths();
            for (const schemaPath of schemaPaths) {
              const schemaRefFilePath = `${schemaPath}/private/${ref.link}`;
              if (fs.existsSync(schemaRefFilePath)) {
                part[reference] = fs.readFileSync(schemaRefFilePath, 'utf-8');
                break;
              }
            }

            if (!part[reference]) {
              warnings.push(`Unable to find file by link '${ref.link}' for interface path '${path.join('.')}'`);
            }
          }

          const isJson = ref.link.endsWith('.json');
          if (isJson) {
            part[reference] = JSON.parse(part[reference]);
          }
        }
      });
    }

    function transformActions(part) {
      if (part.type === 'Schema') {
        const actions = _.get(part, 'actions', { fields: {} });
        _.each(actions.fields, (val, key) => {
          if (val === false) {
            // delete old disabled actions
            delete actions.fields[key];
          }
          if (_.isPlainObject(val) && !val.permissions) {
            // set admin permissions for declared actions (including actions with frontend router)
            val.permissions = appLib.accessCfg.PERMISSIONS.accessAsSuperAdmin;
          }
        });

        // set admin permissions for default actions if not exists
        _.each(appLib.accessCfg.DEFAULT_ACTIONS, action => {
          if (!actions.fields[action] || !actions.fields[action].permissions) {
            _.set(actions.fields, `${action}.permissions`, appLib.accessCfg.PERMISSIONS.accessAsSuperAdmin);
          }
        });

        part.actions = actions;
      }
    }

    function validateActions(part, path) {
      if (part.type === 'Schema') {
        const actions = _.get(part, 'actions', { fields: {} });
        _.each(actions.fields, (spec, modelActionName) => {
          const link = _.get(spec, 'action.link');
          if (!link) {
            if (!appLib.allActionsNames.includes(modelActionName)) {
              errors.push(`Invalid action ${modelActionName} specified by path '${path}'`);
            }
            return;
          }

          if (!_.isString(link)) {
            return errors.push(
              `Action link must be a string if specified, found by path '${path}' for modelActionName '${modelActionName}'`
            );
          }

          const isFrontendAction = link.startsWith('/');
          if (!isFrontendAction && !appLib.allActionsNames.includes(link)) {
            return errors.push(
              `Action link '${link}' is not valid (must be one of default or custom actions if specified), found by path '${path}' for modelActionName '${modelActionName}'`
            );
          }
        });
      }
    }

    function transformFieldPermissions(part) {
      if (!appLib.getAuthSettings().enablePermissions) {
        return;
      }

      // TODO: validate field permissions and throw error on invalid
      const { permissions } = part;
      const isValidType = part.type !== 'Schema' && part.type !== 'Group';
      if (!permissions && isValidType) {
        const { accessAsAnyone } = appLib.accessCfg.PERMISSIONS;
        part.permissions = {
          view: accessAsAnyone,
          create: accessAsAnyone,
          update: accessAsAnyone,
          upsert: accessAsAnyone,
        };
      } else if (_.isString(permissions) || _.isArray(permissions)) {
        part.permissions = {
          view: permissions,
          create: permissions,
          update: permissions,
          upsert: permissions,
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
          upsert: writePermission,
        };
      }
    }

    function transformFilters(part) {
      const { filter } = part;
      if (filter) {
        return;
      }

      const filterName = appLib.filterUtil.getDefaultFilterName(part);
      if (filterName) {
        part.filter = filterName;
      }
    }

    function validateFilters(part, path) {
      const { filter } = part;
      if (!filter) {
        return;
      }

      const metaschemaFilter = appLib.appModel.metaschema.filters[filter];
      const pathMsg = path.join('.');
      if (!metaschemaFilter) {
        return errors.push(`Unable to find metaschema filter by name '${filter}' specified by path ${pathMsg}`);
      }
      const { type, value } = metaschemaFilter.where || {};
      if (!['function', 'reference', 'code'].includes(type)) {
        return errors.push(
          `Invalid filter specification by path '${pathMsg}': found unknown type '${type}'. Must be one of ['function', 'reference', 'code']`
        );
      }
      if (type === 'function' && !appLib.appModelHelpers.FiltersWhere[value]) {
        return errors.push(`Unable to find appModelHelpers filter by name '${filter}' specified by path '${pathMsg}'`);
      }
      if (type === 'reference' && !appLib.appModel.metaschema.filters[value]) {
        return errors.push(`Unable to find metaschema filter by reference '${filter}' specified by path '${pathMsg}'`);
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
              errors.push(`Found permission with not String type. Permission: ${permission}, path: ${path}`);
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

      const listPath = _.concat(path, 'list').join('.');
      if (!_.isPlainObject(list)) {
        return errors.push(`Attribute ${listPath} after transformation must be an object.`);
      }

      const listName = list.name;
      const listVal = list.values;
      const listValByName = _.get(appLib.appModelHelpers, ['Lists', listName]);

      if (listValByName && listVal) {
        return errors.push(
          `Attribute ${listPath} must have only one source of values for list (either 'name' or 'values')`
        );
      }

      if (!list.isDynamicList && !_.isPlainObject(listValByName || listVal)) {
        errors.push(`Attribute ${listPath} must have list values(inlined or referenced) represented as object`);
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

      const transformedAppModel = getAppModelWithTransformedPermissions(appLib.appModel.models);
      _.set(appLib.appModel, 'models', transformedAppModel);

      transformListPermissions(appLib.ListsFields, appLib.appModel.models);

      const mainMenuItems = _.get(appLib, 'appModel.interface.mainMenu.fields');
      transformMenuPermissions(mainMenuItems, appLib.allActionsNames);

      const pages = _.get(appLib, 'appModel.interface.pages.fields');
      transformPagesPermissions(pages, appLib.allActionsNames);
    }

    function validatePermissions() {
      if (!appLib.getAuthSettings().enablePermissions) {
        log.trace(`Flag enablePermissions is disabled, handling app permissions is skipped.`);
        return;
      }

      // should be created in method collectUsedPermissionNames
      if (!appLib.appModel.usedPermissions) {
        throw new Error(`Used permissions are not preloaded`);
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
          warnings.push(
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
        warnings.push(
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
      if (!appLib.ListsFields) {
        appLib.ListsFields = [];
      }

      const pathToModelField = path.join('.'); // for example 'roles.fields.permissions'
      if (_.get(part, 'list')) {
        appLib.ListsFields.push(pathToModelField);
      }
    }

    function transformLists(part) {
      if (!part.list) {
        return;
      }

      const { enablePermissions } = appLib.getAuthSettings();
      const anyoneListScopeForViewAction = enablePermissions ? appLib.accessUtil.getAnyoneListScopeForViewAction() : {};
      const adminListScopeForViewAction = enablePermissions ? appLib.accessUtil.getAdminListScopeForViewAction() : {};

      const listVal = part.list;
      if (_.isString(listVal)) {
        // transform to object
        part.list = {
          name: listVal,
          scopes: anyoneListScopeForViewAction,
        };
      } else if (_.isPlainObject(listVal)) {
        const newFormatListFields = ['name', 'values', 'scopes'];
        const isNewListFormat = _.every(listVal, (field, fieldName) => newFormatListFields.includes(fieldName));

        if (isNewListFormat) {
          const listScopes = listVal.scopes;
          if (listScopes) {
            expandPermissionsForScopes(listScopes, appLib.allActionsNames);
            // add admin scope to existing scopes to make sure admin may retrieve full list
            // since existing scopes might return stripped down lists
            listVal.scopes = _.merge(listScopes, adminListScopeForViewAction);
          } else {
            listVal.scopes = anyoneListScopeForViewAction;
          }
        } else {
          part.list = {
            values: listVal,
            scopes: anyoneListScopeForViewAction,
          };
        }
      }

      handleDynamic(part.list);
      handleScopes(part.list);

      function handleDynamic(list) {
        const { name } = list;
        if (!_.isString(name)) {
          list.isDynamicList = false;
          return;
        }

        const urlBeginnings = ['http://', 'https://', '/'];

        const isNameUrl = urlBeginnings.some(b => name.startsWith(b));
        if (isNameUrl) {
          list.name = getListFullUrl(name);
          list.isDynamicList = true;
          return;
        }

        const listReference = appLib.appModelHelpers.Lists[name];
        if (!_.isString(listReference)) {
          list.isDynamicList = false;
          return;
        }
        const isListReferenceUrl = urlBeginnings.some(b => listReference.startsWith(b));
        if (isListReferenceUrl) {
          list.name = getListFullUrl(listReference);
          list.isDynamicList = true;
          return;
        }
        errors.push(`Found list with name '${name}' which is not an url and not a list reference to an url.`);

        function getListFullUrl(url) {
          const isShortFormUrl = url.startsWith('/');
          if (!isShortFormUrl) {
            return url;
          }

          const appUrl = process.env.APP_URL;
          const isValidAppUrl = appUrl && ['http://', 'https://'].some(b => appUrl.startsWith(b));
          if (!isValidAppUrl) {
            errors.push(
              `Param 'APP_URL' must be valid (startsWith 'http://' or 'https://') to build a full url for dynamic list with a short url '${url}'`
            );
          }
          return `${appUrl}${url}`;
        }
      }

      function handleScopes(list) {
        _.each(list.scopes, scope => {
          scope.where = scope.where || 'return true';
          scope.return = scope.return || 'return $list';
        });
      }
    }

    function validateModelPart(part, path) {
      transformForBackwardCompatibility(part, path);
      addSchemeNameOrFieldName(part, path);
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
      setDefaultAttributes(part);
      transformActions(part);
      validateActions(part, path);
      handleVisibleAttribute(part, path);
      handleOrderAttribute(part, path);
      transformFieldPermissions(part);
      transformFilters(part, path);
      validateFilters(part, path);
      collectUsedPermissionNames(part, path);
      validateFieldName(path);
      addLookupMeta(part, path);

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

      deleteDisabledMenuItems(part);
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

  m.getMongooseModel = (model, collectionName) => {
    const mongooseSchemaDefinition = {};
    m.getMongooseSchemaDefinition(null, model, mongooseSchemaDefinition);
    const schema = new mongoose.Schema(mongooseSchemaDefinition, {
      collection: collectionName,
      strict: true,
      versionKey: false,
      minimize: true,
    });

    if (model.schemaTransform) {
      if (typeof model.schemaTransform === 'string') {
        model.schemaTransform = [model.schemaTransform];
      }
      model.schemaTransform.forEach(transformer => {
        schemaTransformers[transformer](schema);
      });
    }

    return schema;
  };

  /**
   * Generates mongoose models based on models JSON and puts them in m.mongooseModels hash
   * Note that some methods require m.mongoos_models to be populated before they work correctly
   * @param db the mongoose db connection
   * @param models JSON defining the model
   * @param isOverride
   */
  m.generateMongooseModels = (db, models, isOverride) =>
    Promise.map(Object.entries(models), ([name, model]) => {
      try {
        const collectionName = name;
        const mongooseModelName = name;
        const schema = m.getMongooseModel(model, collectionName);
        log.trace(`Generating model ${name}`);
        if (isOverride) {
          delete db.models[mongooseModelName];
        }
        return db.model(mongooseModelName, schema);
      } catch (e) {
        log.error('MDL001', `Unable to generate mongoose model ${name}`);
        throw e;
      }
    });

  m.removeIrrelevantSingleUniqueIndexes = collectionName => {
    const collection = appLib.db.collection(collectionName);
    const modelUniqueFields = getModelUniqueFields(collectionName);
    return getRemoveModelUniqueIndexesPromise(collection, modelUniqueFields);

    async function getRemoveModelUniqueIndexesPromise(_collection, _modelUniqueFields) {
      try {
        const uniqueIndexes = (await _collection.getIndexes({ full: true })).filter(i => i.unique === true);
        return Promise.map(uniqueIndexes, index => {
          const keyPaths = Object.keys(index.key);
          const isUniqueIndexNotExistsInSchema = keyPaths.length === 1 && !_modelUniqueFields.has(keyPaths[0]);
          if (isUniqueIndexNotExistsInSchema) {
            log.info(`Dropping unique index which does not exists in schema: ${index.name}`);
            return _collection.dropIndex(index.name);
          }
        });
      } catch (e) {
        if (e.codeName === 'NamespaceNotFound') {
          // collections does not exist, so skip removing unique indexes
          return;
        }
        log.info(`Error occurred while removing unique indexes for collection '${_collection}'`);
        throw e;
      }
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

  m.handleIndexes = async () => {
    const collectionNames = Object.keys(appLib.appModel.models);

    await Promise.mapSeries(collectionNames, collectionName =>
      // log.info(`Handling indexes for collection '${collectionName}'`);
      m.removeIrrelevantSingleUniqueIndexes(collectionName)
    );

    const entriesWithIndexes = Object.entries(appLib.appModel.models).filter(([, model]) => model.indexes);

    await Promise.mapSeries(entriesWithIndexes, ([collectionName, model]) => {
      return Promise.mapSeries(Object.entries(model.indexes), ([indexSpecName, indexSpec]) => {
        return appLib.db
          .collection(collectionName)
          .createIndex(indexSpec.keys, indexSpec.options)
          .catch(e => {
            throw new Error(
              `Unable to create index for collection '${collectionName}' and indexSpecName '${indexSpecName}'.\n${e.stack}`
            );
          });
      });
    });
  };

  return m;
};
