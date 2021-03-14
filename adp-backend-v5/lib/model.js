/**
 * @module model-util
 * This module provides utilities shared between multiple applications and allows models manipulation for
 * Conceptant applications.
 */

const log = require('log4js').getLogger('lib/model');
const fs = require('fs-extra');
const nodePath = require('path');
const _ = require('lodash');
const Promise = require('bluebird');
const ejs = require('ejs');
const { appRoot } = require('./util/env');
const { getFunction } = require('./util/memoize');

const {
  getItemPathByFullModelPath,
  getJsonPathByFullModelPath,
  getMongoPathByFullModelPath,
  getBeforeAndAfterLastArrayPath,
  camelCase2CamelText,
  stringifyObj,
} = require('./util/util');
// const schemaTransformers = require('./schema-transformers')();
const {
  getTransformedInterfaceAppPermissions,
  transformMenuPermissions,
  transformPagesPermissions,
  expandPermissionsForScopes,
  expandPermissionsForScope,
} = require('./access/transform-permissions');
const {
  combineModels,
  removeNullsFromObj,
  schemaKeyRegExp,
  EJS_BACKEND_APP_SCHEMA_DELIMITER,
} = require('./util/model');
const { getSchemaPaths, getSchemaNestedPaths } = require('./util/env');

module.exports = (appLib) => {
  const m = {};

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
  m.validateRequiredFields = (models) => {
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
      const validTypesToGoDeeper = ['Schema', 'Object', 'Array'];
      if (!validTypesToGoDeeper.includes(part.type)) {
        return fieldsErrors;
      }

      let isPartHasRequiredFields = false;
      _.each(part.fields, (field, fieldName) => {
        const isFieldRequired = field.required === true;
        isPartHasRequiredFields = isPartHasRequiredFields || isFieldRequired;
        if (validTypesToGoDeeper.includes(field.type)) {
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
    const errors = [];
    const warnings = [];

    expandOtherFieldPart(appLib.appModel);
    // interface.app.permissions might be merged with 'other' object from APP_SCHEMA
    appLib.accessUtil.setAvailablePermissions();

    setAppAuthSettings(warnings);
    initLookupAndTreeSelectorMeta();

    const { models } = appLib.appModel;
    processModelParts({ parts: models, path: [], errors, warnings, collectMeta: true, mergeDefaults: true });
    // lookups and treeselectors are dependent from other models this is why they are processed after main transformations
    processLookupsAndTreeSelectors({ parts: models, path: [], errors, warnings, collectMeta: true });

    removeNullsFromObj(models);

    setLookupFieldsMeta();
    transformAppPermissions({ errors });

    if (appLib.appModel.interface) {
      validateInterfaceParts({ parts: appLib.appModel.interface, path: [], errors, warnings }); // TODO: add test for this
      // validateInterfaceParts is recursive only for 'fields' field, this is why custom paths is handled separately
      _.each(['mainMenu', 'loginPage', 'charts', 'pages'], (interfacePart) => {
        if (appLib.appModel.interface[interfacePart]) {
          validateInterfaceParts({
            parts: appLib.appModel.interface[interfacePart],
            path: [interfacePart],
            errors,
            warnings,
          });
        }
      });
    }

    validateAppPermissions({ errors, warnings });
    const requiredWarnings = m.validateRequiredFields(models);
    warnings.push(...requiredWarnings);

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
  };

  /** Function that changes old format of something to new format of something
   *  Further old format should not be supported completely.
   * */
  function transformForBackwardCompatibility(part) {
    if (part.showInGraphQL) {
      part.showInGraphql = part.showInGraphQL;
      delete part.showInGraphQL;
    }
  }

  function validateSchemaKey(part, path, errors) {
    const key = path[path.length - 1];
    if (!schemaKeyRegExp.test(key)) {
      errors.push(
        `Found invalid key '${key}' by path ${path.join(
          '.'
        )}. Every key must match pattern ${schemaKeyRegExp.toString()}`
      );
    }
  }

  /**
   * Merges the defaults set in the typeDefaults and subtypeDefaults into the appModel part
   * @param part
   */
  function mergeTypeDefaults(part, coerceDefaultType) {
    if (!part.type) {
      if (!coerceDefaultType) {
        return;
      }
      part.type = appLib.appModel.metaschema.type.default;
    }
    const defaults = _.get(appLib.appModel, ['typeDefaults', 'fields', part.type], {});
    _.mergeWith(part, defaults, customMergeWithArrayConcat);
    const { subtype } = part;
    const isBackwardCompatibilitySubtype = subtype === part.type;
    if (subtype && !isBackwardCompatibilitySubtype) {
      const subtypeDefaults = _.get(appLib.appModel, `subtypeDefaults.fields.${part.subtype}`, {});
      _.mergeWith(part, subtypeDefaults, customMergeWithArrayConcat);
    }
    removeNullsFromObj(part);

    function customMergeWithArrayConcat(destinationValue, sourceValue) {
      // destinationValue is the target value, see https://lodash.com/docs/4.17.10#mergeWith
      if (_.isBoolean(destinationValue)) {
        return destinationValue;
      }
      if (_.isArray(destinationValue) && _.isArray(sourceValue)) {
        return sourceValue.concat(destinationValue);
      }
      if (_.isString(destinationValue) && _.isArray(sourceValue)) {
        return sourceValue.concat([destinationValue]);
      }
      if (typeof destinationValue === 'undefined') {
        return _.cloneDeep(sourceValue);
      }
      if (sourceValue == null || destinationValue == null) {
        return null;
      }
      if (_.isString(sourceValue) && _.isString(destinationValue)) {
        return destinationValue;
      }
      return _.mergeWith(destinationValue, sourceValue, customMergeWithArrayConcat);
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
  function validateDefaultSortBy(part, path, errors) {
    if (!_.has(part, 'defaultSortBy')) {
      return;
    }

    if (typeof part.defaultSortBy !== 'object') {
      return errors.push(`defaultSortBy in ${path.join('.')} has incorrect format, must be an object`);
    }

    _.each(part.defaultSortBy, (val, key) => {
      if (val !== -1 && val !== 1) {
        errors.push(
          `defaultSortBy in ${path.join('.')} has incorrect format, the sorting order must be either 1 or -1`
        );
      }

      if (part.type !== 'Grid') {
        const hasNonExistingField = !_.has(part.fields, key) && key !== '_id';
        if (hasNonExistingField) {
          errors.push(`defaultSortBy in ${path.join('.')} refers to nonexisting field "${key}"`);
        }
      }
    });
  }

  /**
   * Uses validatorShortcuts to expand validators into full form
   * @param part
   * @param path
   */
  function expandValidators(part, path, errors) {
    if (_.has(part, 'validate')) {
      if (typeof part.validate === 'string') {
        part.validate = [part.validate];
      }
      part.validate = _.map(part.validate, (handler) => {
        /* eslint-disable security/detect-unsafe-regex */
        const matches = _.isString(handler) ? handler.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(\((.*)\))?$/) : null;
        let handlerSpec;
        if (matches) {
          const handlerName = matches[1];
          const matchedArguments = matches[3] ? matches[3].split(',') : [];
          if (appLib.appModel.validatorShortcuts[handlerName]) {
            handlerSpec = {
              validator: handlerName,
              arguments: _.mapValues(appLib.appModel.validatorShortcuts[handlerName].arguments, (o) =>
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
      _.each(part.validate, (val) => {
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
  function makeSureAllTransformersExist(part, path, errors) {
    if (_.has(part, 'transform')) {
      _.each(part.transform, (val) => {
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
      .map((v) => _.capitalize(v))
      .value()
      .join('');
  }

  function transformLookupScopes(tableLookup) {
    if (!appLib.getAuthSettings().enablePermissions) {
      return;
    }
    tableLookup.scopes = _.merge(tableLookup.scopes, appLib.accessUtil.getAdminLookupScopeForViewAction());
    expandPermissionsForScopes(tableLookup.scopes, ['view']);
  }

  function transformLookupLabels(tableLookup) {
    const { label } = tableLookup;
    const isLabelPresentedAsSingleField = !label.includes('this.');
    if (!isLabelPresentedAsSingleField) {
      return;
    }
    tableLookup.label = `this.${label}`;
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
      _.each(part.lookup.table, (tableLookup) => {
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
  function validateLookupsAndTreeSelectorsPart(part, path, errors) {
    if (_.has(part, 'lookup')) {
      if (!_.has(part, 'transform')) {
        // if there is transform, it's already an array, see above
        part.transform = [];
      }
      if (!part.lookup.table) {
        errors.push(`Lookup in ${path.join('.')} doesn't have property "table"`);
      } else {
        _.each(part.lookup.table, (tableLookup) => {
          validateTableLookup(tableLookup);
        });
        validateLookupId(part.lookup);
      }
      return errors;
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
        errors.push(...tableLookupErrors);
        return;
      }

      const model = appLib.appModel.models[tableName];
      if (!model) {
        tableLookupErrors.push(`Lookup in ${pathStr} refers to nonexisting collection "${tableName}"`);
      } else {
        if (!model.fields[foreignKey] && foreignKey !== '_id') {
          tableLookupErrors.push(`Lookup in ${pathStr} refers to nonexisting foreignKey "${foreignKey}"`);
        }

        const fieldsInLabel = (label.match(/this\.\w+/gi) || []).map((s) => s.replace('this.', ''));
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
      errors.push(...tableLookupErrors);
    }

    function validateLookupId(lookup) {
      const joinedPath = path.join('.');
      const lookupId = lookup.id;
      if (!lookupId) {
        errors.push(`Lookup in '${joinedPath}' must have 'id' field`);
      }

      const lookupIdPath = appLib.lookupIds[lookupId];
      const isLookupExist = !_.isNil(lookupIdPath);
      const isLookupPathMatchCurrentPath = _.isEqual(lookupIdPath, joinedPath);
      if (isLookupExist && !isLookupPathMatchCurrentPath) {
        errors.push(
          `Lookup id '${lookupId}' in '${joinedPath}' is already used for path '${lookupIdPath}'. It must be unique.`
        );
      }
    }
  }

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
  function validateRequiredAttributes(part, path, errors) {
    _.each(appLib.appModel.metaschema, (val, key) => {
      if (val.required && !_.has(part, key)) {
        errors.push(`Attribute ${path.join('.')} doesn't have required property "${key}"`);
      }
    });
  }

  function addValidatorForConditionalRequired(part) {
    if (!part.required) {
      return;
    }

    const requiredValidator = {
      validator: 'required',
      arguments: {},
      errorMessages: {
        default: 'Field is required',
      },
    };
    if (_.isArray(part.validate)) {
      part.validate.push(requiredValidator);
    } else {
      part.validate = [requiredValidator];
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

      ['showInDatatable', 'showInViewDetails', 'showInForm', 'showInGraphql'].forEach((showField) => {
        const isShowFieldSpecified = part[showField] !== undefined;
        if (!isShowFieldSpecified) {
          part[showField] = visible;
        }
      });

      delete part.visible;
    }
  }

  function handleOrderAttribute(part, path, errors) {
    if (part.type && part.type !== 'Schema') {
      const { order } = part;
      if (order === undefined) {
        return;
      }
      if (!_.isNumber(order)) {
        return errors.push(`Attribute 'order' must be a number for path '${path.join('.')}'`);
      }

      ['formOrder', 'datagridOrder', 'detailedViewOrder'].forEach((orderField) => {
        const isOrderFieldSpecified = part[orderField] !== undefined;
        if (!isOrderFieldSpecified) {
          part[orderField] = order;
        }
      });
      delete part.order;
    }
  }

  function collectLookupMeta(part, path) {
    if (_.has(part, 'lookup')) {
      const lookupId = part.lookup.id;
      appLib.lookupIds[lookupId] = path.join('.');
    }

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
      lookupData.isLeaf = getFunction(`return ${lookupData.leaves}`);
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

  function handleStaticHtml(part, path, errors) {
    if (part.type === 'StaticHtml') {
      const { type, link } = part.template || {};
      const ejsOptions = { context: appLib.macrosFunctionContext, delimiter: EJS_BACKEND_APP_SCHEMA_DELIMITER };

      if (type === 'inline') {
        // macros are already processed before therefore 'link' already contains processed data
        return;
      }

      if (type === 'file') {
        const template = getFileContentByLink(link);
        if (!template) {
          return errors.push(`Unable to find file by link '${link}' for path '${path.join('.')}'`);
        }

        const rendered = ejs.render(template, {}, ejsOptions);
        part.template.link = rendered;
      }
    }
  }

  function validateFieldName(part, path, errors) {
    const lastFieldName = path[path.length - 1];
    const alphanumericOrQuotesRegExp = /^[\w"]+$/;
    if (!alphanumericOrQuotesRegExp.test(lastFieldName)) {
      errors.push(
        `Field '${lastFieldName}' has invalid name: should contain only alphanumeric and quotes. ` +
          `Path: '${path.join('.')}'`
      );
    }
  }

  function getFileContentByLink(link) {
    const schemaPaths = getSchemaPaths();
    for (const schemaPath of schemaPaths) {
      const schemaRefFilePath = `${schemaPath}/private/${link}`;
      if (fs.existsSync(schemaRefFilePath)) {
        return fs.readFileSync(schemaRefFilePath, 'utf-8');
      }
    }

    const defaultFilePath = nodePath.resolve(appRoot, `model/private/${link}`);
    if (fs.existsSync(defaultFilePath)) {
      return fs.readFileSync(defaultFilePath, 'utf-8');
    }

    return null;
  }

  /**
   * Loads data specified in external file for all metaschema attributes that have supportsExternalData == true
   * @param part
   * @param path
   */
  function loadExternalData(part, path, warnings = []) {
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

    _.each(supportsExternalData, (reference) => {
      const ref = _.get(part, reference);
      if (!_.isPlainObject(ref)) {
        return;
      }

      const { type, link } = ref;
      if (type === 'file' && _.isString(link)) {
        const fileContent = getFileContentByLink(link);
        if (fileContent) {
          part[reference] = fileContent;
        } else {
          warnings.push(`Unable to find file by link '${link}' for interface path '${path.join('.')}'`);
        }

        const isJson = link.endsWith('.json');
        if (isJson) {
          part[reference] = JSON.parse(part[reference]);
        }
      }
    });
  }

  function transformActions(part) {
    if (part.type !== 'Schema') {
      return;
    }
    const actions = _.get(part, 'actions', { fields: {} });
    _.each(actions.fields, (val, actionName) => {
      if (val === false) {
        delete actions.fields[actionName];
      }

      if (_.isPlainObject(val)) {
        val.actionName = actionName;

        if (!val.permissions) {
          // set admin permissions for declared actions (including actions with frontend router)
          val.permissions = appLib.accessCfg.PERMISSIONS.accessAsSuperAdmin;
        }
      }
    });

    part.actions = actions;
  }

  function validateActions(part, path, errors) {
    if (part.type === 'Schema') {
      const actions = _.get(part, 'actions', { fields: {} });
      _.each(actions.fields, (spec, modelActionName) => {
        if (!_.isPlainObject(spec)) {
          return errors.push(`Invalid specification for '${modelActionName}' action for scheme '${path}'`);
        }

        const link = _.get(spec, 'action.link');
        const type = _.get(spec, 'action.type');

        if (!link) {
          if (!appLib.allActionsNames.includes(modelActionName)) {
            errors.push(`Invalid action '${modelActionName}' specified for scheme '${path}'`);
          }
          return;
        }

        if (!_.isString(link)) {
          return errors.push(
            `Action link must be a string if specified, found in scheme '${path}' for action '${modelActionName}'`
          );
        }

        if (type !== 'module') {
          const isFrontendAction = link.startsWith('/');
          const isUrlAction = link.startsWith('http://') || link.startsWith('https://');
          if (!isUrlAction && !isFrontendAction && !appLib.allActionsNames.includes(link)) {
            return errors.push(
              `Action link '${link}' is not valid (must be one of default or custom actions if specified), found in scheme '${path}' for action '${modelActionName}'`
            );
          }
        }
      });
    }
  }

  function transformScopes(part) {
    if (part.type !== 'Schema') {
      return;
    }

    const modelActionNames = _.keys(_.get(part, 'actions.fields'));
    expandPermissionsForScopes(part.scopes, modelActionNames);
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
        clone: accessAsAnyone,
        delete: accessAsAnyone,
        update: accessAsAnyone,
        upsert: accessAsAnyone,
      };
    } else if (_.isString(permissions) || _.isArray(permissions)) {
      part.permissions = {
        view: permissions,
        create: permissions,
        clone: permissions,
        delete: permissions,
        update: permissions,
        upsert: permissions,
      };
    } else if (_.isPlainObject(permissions)) {
      const { read, write } = permissions;
      const isReadWritePermissionObject = read || write;
      if (!isReadWritePermissionObject) {
        return;
      }

      const { accessAsSuperAdmin } = appLib.accessCfg.PERMISSIONS;
      const readPermission = read || accessAsSuperAdmin;
      const writePermission = write || accessAsSuperAdmin;

      part.permissions = {
        view: readPermission,
        create: writePermission,
        clone: writePermission,
        delete: writePermission,
        update: writePermission,
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

  function validateFilters(part, path, errors) {
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
    if (_.isPlainObject(part) && part.type === 'Menu' && part.fields) {
      _.each(part.fields, (val, key) => {
        if (val === false) {
          delete part.fields[key];
        }
      });
    }
  }

  function validatePermissionNames(part, path, errors) {
    // schema, list scopes
    validatePermissionsFromScopes(part);

    // schema actions
    const actionFields = _.get(part, 'actions.fields');
    _.each(actionFields, (val) => {
      const actionPermissions = _.get(val, 'permissions');
      validatePermissions(actionPermissions);
    });

    // lookup scopes
    if (part.type.startsWith('LookupObjectID')) {
      const lookups = _.get(part, 'lookup.table');
      _.each(lookups, (lookup) => {
        validatePermissionsFromScopes(lookup);
      });
    }

    // fields permissions
    if (part.permissions) {
      validatePermissions(part.permissions);
    }

    function validatePermissions(permissions) {
      if (!permissions) {
        return;
      }

      if (_.isArray(permissions)) {
        _.flattenDeep(permissions).forEach((permission) => {
          if (!_.isString(permission)) {
            errors.push(`Found permission with not String type. Permission: ${permission}, path: ${path}`);
          }
        });
      } else if (_.isPlainObject(permissions)) {
        _.each(permissions, (objPermission) => {
          validatePermissions(objPermission);
        });
      }
    }

    function validatePermissionsFromScopes(_part) {
      const scopeFields = _.get(_part, 'scopes');
      _.each(scopeFields, (scopeObj) => {
        const scopePermissions = _.get(scopeObj, 'permissions');
        validatePermissions(scopePermissions, errors);
      });
    }
  }
  /**
   * Collects all permission names for future validation with models
   * @param part
   * @param path
   */
  function collectUsedPermissionNames(part) {
    if (!part.type) {
      return;
    }

    if (!appLib.appModel.usedPermissions) {
      appLib.appModel.usedPermissions = new Set();
    }
    // According to 'Attaching Permissions' https://confluence.conceptant.com/pages/viewpage.action?pageId=1016055
    // There are many places where permissions are used

    // schema, list scopes
    addPermissionsFromScopes(part);

    // schema actions
    const actionFields = _.get(part, 'actions.fields');
    _.each(actionFields, (val) => {
      const actionPermissions = _.get(val, 'permissions');
      addToUsedPermissions(actionPermissions);
    });

    // add lookup scopes
    if (part.type.startsWith('LookupObjectID')) {
      const lookups = _.get(part, 'lookup.table');
      _.each(lookups, (lookup) => {
        addPermissionsFromScopes(lookup);
      });
    }

    // add fields permissions
    if (part.permissions) {
      addToUsedPermissions(part.permissions);
    }

    function addPermissionsFromScopes(_part) {
      const scopeFields = _.get(_part, 'scopes');
      _.each(scopeFields, (scopeObj) => {
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
      } else if (_.isArray(permissions)) {
        _.flattenDeep(permissions).forEach((permission) => {
          appLib.appModel.usedPermissions.add(permission);
        });
      } else if (_.isPlainObject(permissions)) {
        _.each(permissions, (objPermission) => {
          addToUsedPermissions(objPermission);
        });
      }
    }
  }

  function getIndexSpecNameByKeys(indexKeys) {
    let indexSpecName = '';
    _.each(indexKeys, (val, indexKey) => {
      indexSpecName += `${indexKey}${val}`;
    });
    return indexSpecName;
  }

  function transformModelsIndexes(part, path, errors) {
    if (part.type !== 'Schema' || _.isNil(part.indexes)) {
      return;
    }

    if (_.isNil(part.indexes)) {
      part.indexes = [];
      return;
    }

    const indexErrors = [];
    _.each(part.indexes, (indexSpec, key) => {
      const indexSpecPath = path.concat(['indexes', key]);
      if (!_.isPlainObject(indexSpec.keys) || _.keys(indexSpec.keys).length === 0) {
        return indexErrors.push(`Index specification by path '${indexSpecPath}' must have 'keys' specification`);
      }

      const invalidKeysSpecifactions = _.pickBy(indexSpec.keys, (v) => v !== 1 && v !== -1);
      if (!_.isEmpty(invalidKeysSpecifactions)) {
        return indexErrors.push(
          `Index specification by path '${indexSpecPath}' has invalid keys ${stringifyObj(invalidKeysSpecifactions)}`
        );
      }
    });

    if (indexErrors.length) {
      errors.push(...indexErrors);
      return;
    }

    const isAlreadyTransformed = _.isArray(part.indexes);
    if (isAlreadyTransformed) {
      return;
    }

    part.indexes = _.map(part.indexes, (indexSpec, key) => {
      const background = _.get(indexSpec, 'options.background');
      if (background !== false) {
        _.set(indexSpec, 'options.background', true);
      }

      const indexSpecName = key || getIndexSpecNameByKeys(indexSpec.keys);
      return { ...indexSpec, indexSpecName };
    });
  }

  function addIndexesByFields(part, path) {
    const hasIndex = part.index === true;
    const hasUnique = part.unique === true;
    const isLocation = part.type === 'Location';
    if (!hasIndex && !hasUnique && !isLocation) {
      return;
    }

    const [modelName, ...fieldPathArray] = path;
    const fieldPath = fieldPathArray.filter((val, key) => key % 2 === 1).join('.');

    const indexSpec = {
      options: { background: true },
    };

    if (hasUnique === true) {
      indexSpec.keys = { [fieldPath]: 1 };
      indexSpec.options = { unique: true };
    } else if (hasIndex) {
      indexSpec.keys = { [fieldPath]: 1 };
    }

    if (isLocation) {
      indexSpec.keys = { [fieldPath]: '2dsphere' };
    }

    const isLookupType = ['LookupObjectID', 'LookupObjectID[]', 'TreeSelector'].includes(part.type);
    if (isLookupType) {
      indexSpec.keys = { [`${fieldPath}._id`]: 1, [`${fieldPath}.table`]: 1 };
    }

    if (indexSpec.keys) {
      indexSpec.indexSpecName = getIndexSpecNameByKeys(indexSpec.keys);
      const modelIndexes = _.get(appLib.appModel.models, [modelName, 'indexes'], []);
      const isIndexForCurrentFieldExist = modelIndexes.find((i) => i.indexSpecName === indexSpec.indexSpecName);

      if (!isIndexForCurrentFieldExist) {
        modelIndexes.push(indexSpec);
        _.set(appLib.appModel.models, [modelName, 'indexes'], modelIndexes);
      }
    }
  }

  /**
   * Validates list format and checks that referred list exists in appModelHelpers.Lists
   * Add dynamic list validator if necessary
   * @param part
   * @param path
   */
  function validateLists(part, path, errors) {
    const { list } = part;
    if (!list) {
      return;
    }

    const listPath = _.concat(path, 'list').join('.');
    if (!_.isPlainObject(list)) {
      return errors.push(`Attribute ${listPath} after transformation must be an object.`);
    }

    const listName = list.name;
    const listValues = list.values;
    const listReferenceByName = _.get(appLib.appModelHelpers, ['Lists', listName]);

    if (listReferenceByName && listValues) {
      return errors.push(
        `Attribute ${listPath} must have only one source of values for list (either 'name' or 'values')`
      );
    }

    const isValidListReference = _.isPlainObject(listReferenceByName) || _.isFunction(listReferenceByName);
    if (!list.isDynamicList && !_.isPlainObject(listValues) && !isValidListReference) {
      errors.push(
        `Attribute ${listPath} must have list 'values' represented as object or 'name' referenced to object or function`
      );
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
  function validateValuesAreAllowedInMetaschema(part, path, val, key, errors) {
    if (
      appLib.appModel.metaschema[key] &&
      _.has(appLib.appModel.metaschema[key], 'list') &&
      !_.includes(appLib.appModel.metaschema[key].list, val)
    ) {
      // value is not allowed in metaschema
      errors.push(
        `Value '${val}' is not listed in metaschema for '${key}', found by path '${_.concat(path, key).join('.')}'`
      );
    }
  }

  /**
   * Validates that the attribute is allowed in metaschema
   * @param part
   * @param path
   * @param val
   * @param key
   */
  function validateAttributeAllowed(part, path, val, key, errors) {
    const allowedAttributes = _.keys(appLib.appModel.metaschema);
    if (!_.includes(allowedAttributes, key)) {
      // attribute of app model is listed in metadata
      errors.push(`Unknown attribute ${_.concat(path, key).join('.')}`);
    }
  }

  function transformAppPermissions({ errors }) {
    const appPermissions = _.get(appLib.appModel, 'interface.app.permissions');
    const newAppPermissions = getTransformedInterfaceAppPermissions(appPermissions, errors);
    newAppPermissions && _.set(appLib.appModel, 'interface.app.permissions', newAppPermissions);

    const mainMenuItems = _.get(appLib, 'appModel.interface.mainMenu.fields');
    transformMenuPermissions(mainMenuItems, appLib.allActionsNames);

    const pages = _.get(appLib, 'appModel.interface.pages.fields');
    transformPagesPermissions(pages, appLib.allActionsNames);
  }

  function validateAppPermissions({ errors, warnings }) {
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

  function setAppAuthSettings(warnings) {
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

  function transformLists(part, path, errors) {
    if (!part.list) {
      return;
    }

    const { enablePermissions } = appLib.getAuthSettings();
    const anyoneListScopeForViewAction = enablePermissions ? appLib.accessUtil.getAnyoneListScope() : {};
    const adminListScopeForViewAction = enablePermissions ? appLib.accessUtil.getAdminListScope() : {};

    const listVal = part.list;
    if (_.isString(listVal)) {
      // transform to object
      part.list = {
        name: listVal,
        scopes: anyoneListScopeForViewAction,
      };
    } else if (_.isPlainObject(listVal)) {
      const newFormatListFields = ['name', 'values', 'scopes', 'params'];
      const isNewListFormat = _.every(listVal, (field, fieldName) => newFormatListFields.includes(fieldName));

      if (isNewListFormat) {
        const listScopes = listVal.scopes;
        if (listScopes) {
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

      const isNameUrl = urlBeginnings.some((b) => name.startsWith(b));
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
      const isListReferenceUrl = urlBeginnings.some((b) => listReference.startsWith(b));
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
        const isValidAppUrl = appUrl && ['http://', 'https://'].some((b) => appUrl.startsWith(b));
        if (!isValidAppUrl) {
          errors.push(
            `Param 'APP_URL' must be valid (startsWith 'http://' or 'https://') to build a full url for dynamic list with a short url '${url}'`
          );
        }
        return `${appUrl}${appLib.getFullRoute(appLib.API_PREFIX, url)}`;
      }
    }

    function handleScopes(list) {
      _.each(list.scopes, (scope) => {
        expandPermissionsForScope(scope, appLib.allActionsNames);
        scope.return = scope.return || 'return $list';
      });
    }
  }

  function validateInterfacePart({ part, path, errors, warnings }) {
    loadExternalData(part, path, warnings);
    mergeTypeDefaults(part, false, true);

    deleteDisabledMenuItems(part);
    collectUsedPermissionNames(part);

    if (_.has(part, 'fields')) {
      validateInterfaceParts({ parts: part.fields, path: _.concat(path, 'fields'), errors, warnings });
    }

    // validate and cleanup individual fields
    _.each(part, (val, key) => {
      // validateValuesAreAllowedInMetaschema(part, path, val, key); // fails on dashboards
      deleteComments(part, path, val, key);
    });
  }

  function validateInterfaceParts({ parts, path, errors, warnings }) {
    _.each(parts, (val, key) => {
      validateInterfacePart({ part: val, path: _.concat(path, key), errors, warnings });
    });
  }

  function processModelParts({ parts, path, errors, warnings, collectMeta, mergeDefaults }) {
    _.each(parts, (val, key) => {
      processModelPart({ part: val, path: _.concat(path, key), errors, warnings, collectMeta, mergeDefaults });
    });
  }

  m.validateNewModel = (model, modelName) => {
    const errors = [];
    const warnings = [];
    const part = model;
    const path = [modelName];
    const collectMeta = false;
    const mergeDefaults = false;

    processModelPart({ part, path, errors, warnings, collectMeta, mergeDefaults });
    processLookupsAndTreeSelectorsPart({ part, path, errors, warnings, collectMeta });

    return { errors, warnings };
  };

  m.fixLookupIdDuplicates = (part, path) => {
    _.each(part.fields, (field, key) => {
      fixLookupIdDuplicates(field, _.concat(path, 'fields', key));
    });

    function fixLookupIdDuplicates(_part, _path) {
      if (_part.lookup) {
        const joinedPath = _path.join('.');
        const lookupId = _part.lookup.id;
        const lookupIdPath = appLib.lookupIds[lookupId];

        const isLookupExist = !_.isNil(lookupIdPath);
        const isLookupPathMatchCurrentPath = _.isEqual(lookupIdPath, joinedPath);
        if (isLookupExist && !isLookupPathMatchCurrentPath) {
          _part.lookup.id = generateLookupId(_path);
        }
      }

      if (_.has(_part, 'fields')) {
        m.fixLookupIdDuplicates(_part.fields, _.concat(_path, 'fields'));
      }
    }
  };

  m.upsertNewModel = (model, modelName, action) => {
    const errors = [];
    const warnings = [];
    const part = model;
    const path = [modelName];
    const collectMeta = true;
    // When update or clone (model is already transformed) merging defaults is not performed to avoid accumulating duplicates in arrays ('validate', 'transform').
    const mergeDefaults = action === 'create';

    appLib.appModel.models[modelName] = model;
    processModelPart({ part, path, errors, warnings, collectMeta, mergeDefaults });
    processLookupsAndTreeSelectorsPart({ part, path, errors, warnings, collectMeta });

    return { errors, warnings };
  };

  function processModelPart({ part, path, errors, warnings, collectMeta, mergeDefaults }) {
    transformForBackwardCompatibility(part, path);
    validateSchemaKey(part, path, errors);
    addSchemeNameOrFieldName(part, path);
    if (mergeDefaults) {
      mergeTypeDefaults(part, true);
    }
    convertTransformersToArrays(part, path);
    convertSynthesizersToArrays(part, path);
    validateDefaultSortBy(part, path, errors);
    transformLists(part, path, errors);
    validateLists(part, path, errors);
    expandValidators(part, path, errors);
    convertStringsForNonstringAttributes(part, path);
    makeSureAllTransformersExist(part, path, errors);
    // validateSchemaNamesArePlural(part, path);
    generateFullName(part, path);
    validateRequiredAttributes(part, path, errors);
    addValidatorForConditionalRequired(part);
    setDefaultAttributes(part);
    transformActions(part);
    validateActions(part, path, errors);
    transformScopes(part);
    handleVisibleAttribute(part, path);
    handleOrderAttribute(part, path, errors);
    transformFieldPermissions(part);
    transformFilters(part);
    validateFilters(part, path, errors);
    validateFieldName(part, path, errors);
    handleStaticHtml(part, path, errors);
    validatePermissionNames(part, path, errors);
    transformModelsIndexes(part, path, errors);
    addIndexesByFields(part, path);

    if (collectMeta) {
      collectListsMetaInfo(part, path);
      collectUsedPermissionNames(part);
    }

    if (_.has(part, 'fields')) {
      processModelParts({
        parts: part.fields,
        path: _.concat(path, 'fields'),
        errors,
        warnings,
        collectMeta,
        mergeDefaults,
      });
    }

    // validate and cleanup individual fields
    _.each(part, (val, key) => {
      validateAttributeAllowed(part, path, val, key, errors);
      validateValuesAreAllowedInMetaschema(part, path, val, key, errors);
      deleteComments(part, path, val, key);
    });
  }

  function processLookupsAndTreeSelectors({ parts, path, errors, warnings, collectMeta }) {
    _.each(parts, (val, key) => {
      if (val === null) {
        return;
      }
      processLookupsAndTreeSelectorsPart({ part: val, path: _.concat(path, key), errors, warnings, collectMeta });
    });
  }

  function processLookupsAndTreeSelectorsPart({ part, path, errors, warnings, collectMeta }) {
    transformLookups(part, path);
    transformTreeSelectors(part, path);
    validateLookupsAndTreeSelectorsPart(part, path, errors);

    if (collectMeta) {
      collectLookupMeta(part, path);
    }

    if (_.has(part, 'fields')) {
      processLookupsAndTreeSelectors({
        parts: part.fields,
        path: _.concat(path, 'fields'),
        errors,
        warnings,
        collectMeta,
      });
    }
  }

  /**
   * Expands 'other' field retrieved from data-bridge.
   * Example:
   * 1. Scalar value { title: {  other: 'App title' } } transforms to { title: 'App title' }
   * 2. Object value
   *   {
   *     modelName: {
   *       scopes: { scope1: {...} },
   *       other: { scopes: { scope2: {...} } }
   *     }
   *   }
   *   expands with merge to following object
   *   {
   *     modelName: {
   *       scopes: { scope1: {...}, scope2: {...} }
   *     }
   *   }
   * @param wholeObj
   * @param path
   */
  function expandOtherFieldPart(wholeObj, path = []) {
    const part = _.isEmpty(path) ? wholeObj : _.get(wholeObj, path);
    processOtherValue(wholeObj, part, path);

    _.each(part, (val, key) => {
      if (_.isPlainObject(val)) {
        expandOtherFieldPart(wholeObj, _.concat(path, key));
      }
    });

    function processOtherValue(_wholeObj, _part, _path) {
      if (!_.has(_part, 'other')) {
        return;
      }
      const otherValue = part.other;
      if (_.isPlainObject(otherValue)) {
        delete _part.other;
        _.merge(_part, otherValue);
        log.info(`Merged other object for path '${_path.join('.')}'`);
        return;
      }

      let parsedValue = otherValue;

      if (_.isString(otherValue)) {
        const numberVal = +otherValue;
        const isStringParsedNumber = !Number.isNaN(numberVal);
        if (isStringParsedNumber) {
          parsedValue = numberVal;
        }
      }

      _.set(_wholeObj, _path, parsedValue);
      log.info(`Set other value (${parsedValue}) for path '${_path.join('.')}'`);
    }
  }

  m.removeUnusedIndexes = async (collectionName) => {
    const collection = appLib.db.collection(collectionName);
    let existingIndexes = [];
    try {
      existingIndexes = await collection.indexInformation({ full: true });
    } catch (e) {
      if (e.codeName === 'NamespaceNotFound') {
        // collection does not exist, so unused indexes don't exist
        return;
      }
    }
    const schemaIndexSpecs = appLib.appModel.models[collectionName].indexes;
    const unusedIndexNames = getUnusedIndexNames(schemaIndexSpecs, existingIndexes);

    return Promise.map(unusedIndexNames, (unusedIndexName) => {
      try {
        log.info(`Dropping index '${collectionName}.${unusedIndexName}' which does not exist in schema.`);
        return collection.dropIndex(unusedIndexName);
      } catch (e) {
        log.info(
          `Error occurred while removing unused indexes for collection '${collectionName}'.`,
          `Index names: ${unusedIndexNames.join(', ')}`
        );
        throw e;
      }
    });

    function getUnusedIndexNames(_schemaIndexSpecs, _existingIndexes) {
      const _unusedIndexNames = [];
      _.each(_existingIndexes, (existingIndex) => {
        const { name, unique, key } = existingIndex;
        const isDefaultIdIndex = name === '_id_';
        if (isDefaultIdIndex) {
          return;
        }

        const hasSchemaIndex = !!_schemaIndexSpecs.find((schemaIndexSpec) => {
          const { keys: sKeys, options } = schemaIndexSpec;
          const { unique: sUnique } = options;
          // _.isEqual({a:1, b:1},{b:1, a:1}) = true, this is why arrays of keys and values are compared separately (order matters)
          const hasSameKeys = _.isEqual(_.keys(key), _.keys(sKeys)) && _.isEqual(_.values(key), _.values(sKeys));
          const hasSameUnique = unique === sUnique;
          return hasSameKeys && hasSameUnique;
        });
        if (!hasSchemaIndex) {
          _unusedIndexNames.push(name);
        }
      });

      return _unusedIndexNames;
    }
  };

  m.createIndexes = (collectionName) => {
    const createAllIndexes = process.env.CREATE_INDEXES === 'true';
    const { indexes = [] } = appLib.appModel.models[collectionName];

    return Promise.map(indexes, (indexSpec) => {
      const { keys, options } = indexSpec;
      // do not generate other indexes(not unique) for tests,
      // since it affects only search speed but consumes time and disk space
      const isUniqueIndex = options.unique === true;
      if (!isUniqueIndex && !createAllIndexes) {
        return;
      }

      return appLib.db
        .collection(collectionName)
        .createIndex(keys, options)
        .catch((e) => {
          throw new Error(
            `Unable to create index for collection '${collectionName}' and indexSpec '${stringifyObj(indexSpec)}'.\n${
              e.stack
            }`
          );
        });
    });
  };

  m.handleIndexes = async () => {
    const collectionNames = Object.keys(appLib.appModel.models);

    await Promise.map(collectionNames, (collectionName) => m.removeUnusedIndexes(collectionName));
    await Promise.map(collectionNames, (collectionName) => m.createIndexes(collectionName));
  };

  return m;
};
