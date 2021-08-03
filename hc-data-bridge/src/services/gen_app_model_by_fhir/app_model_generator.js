const glob = require('glob');
const JSON5 = require('json5');
const fs = require('fs');
const helper = require('./helper');
const _ = require('lodash');
const RefsGraphGenerator = require('./refs_graph_generator');
const {getPhiSchemesFlags, getRefs} = require('./lookup_refs_generator');
const {getDomainResourceFields, getExtensionFields, getReferenceFields} = require('./fhir_data_types');

/**
 * Stores HC app model for FHIR refs.
 * App model can be received by key. Key format is: <schemeName>.<path>.
 * Examples:
 * 1) Address.definitions.Address (DomainResource, should be separate collection)
 * 2) Encounter.definitions.Encounter_StatusHistory (BackboneElement, should not be separate collection because its used inside DomainResource only)
 */
class AppModelGenerator {
  constructor () {
    this.settingsFile = './settings/generator_settings.json';
    this._readSettings(this.settingsFile);
    this.schemeDir = '../../fhir_resources/fhir.schema';
    this.appModels = {};
    this.lookupRefs = getRefs();
    this.phiSchemesFlags = getPhiSchemesFlags(this.lookupRefs);
    this.refTypeMap = this._getSchemeRefTypes();
    this.refGraph = new RefsGraphGenerator().getSchemes();
    this.refPath = '';

    this.typeNameToHandler = {
      string: this._stringElem.bind(this),
      boolean: this._booleanElem.bind(this),
      array: this._arrayElem.bind(this),
      number: this._numberElem.bind(this),
    };

    this.relatedPatientResouresPath = './generated/resources_related_with_patient.json';
    this.relatedPatientResources = this._getRelatedPatientResources();
    this.manuallyDefinedSchemes = ['Element', 'Reference', 'Extension'];

    this.DATE_PATTERN = '-?[0-9]{4}(-(0[1-9]|1[0-2])(-(0[0-9]|[1-2][0-9]|3[0-1]))?)?';
    this.DATETIME_PATTERN = '-?[0-9]{4}(-(0[1-9]|1[0-2])(-(0[0-9]|[1-2][0-9]|3[0-1])(T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\\.[0-9]+)?(Z|(\\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00)))?)?)?';
  }

  _readSettings () {
    this.settings = {
      rule: 'include',
      include: [],
    };
    try {
      const settings = JSON5.parse(fs.readFileSync(this.settingsFile, 'utf-8'));
      _.forEach(settings.resources, (resource, schemaName) => {
        const {include} = resource;
        const isIncluded = include === 'true' || include === true || include === '1';
        if (isIncluded) {
          this.settings.include.push(_.upperFirst(_.camelCase(schemaName)));
        }
      });
      this.settings.alwaysIgnored = _.get(settings, 'parameters.alwaysIgnore.list', []);
      this.settings.substitute = _.get(settings, 'parameters.substitute.list', {});
      this.settings.ignoredFields = _.get(settings, 'parameters.ignoredFields.list', []);
      this.settings.invisibleFields = _.get(settings, 'parameters.invisibleFields.list', []);

      if (!_.isArray(this.settings.alwaysIgnored)) throw new Error(`Path 'parameters.alwaysIgnore.list' must be an array`);
      if (!_.isPlainObject(this.settings.substitute)) throw new Error(`Path 'parameters.substitute.list' must be an object`);
      if (!_.isArray(this.settings.ignoredFields)) throw new Error(`Path 'parameters.ignoredFields.list' must be an array`);
      if (!_.isArray(this.settings.invisibleFields)) throw new Error(`Path 'parameters.invisibleFields.list' must be an array`);

      console.log(`Got settings from ${this.settingsFile}`);
    } catch (e) {
      this.settings = {
        rule: 'include',
        ignore: [],
        include: [],
        substitute: {},
        alwaysIgnored: [],
        ignoredFields: [],
        invisibleFields: [],
      };
      console.log(`File ${this.settingsFile} is not valid.\nError: ${e}\nApplied default settings`);
    }
  }

  _getRelatedPatientResources () {
    return JSON.parse(fs.readFileSync(this.relatedPatientResouresPath));
  }

  _getAppModelElemByType (fhirElem, schemePath, curPath) {
    const {type} = fhirElem;
    // console.log(`Getting elem by type: ${type}, fhirElem: ${JSON.stringify(fhirElem)}, schemePath: ${schemePath}`);
    const appElemModel = this.typeNameToHandler[type](fhirElem, schemePath, curPath);
    _.set(appElemModel, 'description', fhirElem.description);
    _.set(appElemModel, 'fullName', helper.getFullNameByName(curPath));
    return appElemModel;
  }

  _stringElem (fhirElem, schemePath, curPath) {
    const modelElem = _.clone(fhirElem);
    modelElem.type = helper.capitalizeFirstLetter(modelElem.type);
    const {pattern} = fhirElem;
    if (pattern) {
      if (pattern === this.DATE_PATTERN) {
        modelElem.type = 'Date';
      } else if (pattern === this.DATETIME_PATTERN) {
        modelElem.type = 'Date';
        modelElem.subtype = 'DateTime';
      }
      // add validation based on pattern field
      // modelElem.validate = [this._getValidator(pattern)];
      delete modelElem.pattern;
    }
    if (modelElem.enum) {
      modelElem.list = modelElem.enum;
      delete modelElem.enum;
    }
    return modelElem;
  }

  _booleanElem (fhirElem, schemePath, curPath) {
    const modelElem = _.clone(fhirElem);
    modelElem.type = helper.capitalizeFirstLetter(modelElem.type);
    return modelElem;
  }

  _arrayElem (fhirElem, curSchemePath, curPath) {
    const ref = fhirElem.items.$ref;
    if (ref) {
      let {schemeFilePath} = this._getSchemePathDefinitionPath(ref, curSchemePath);
      fhirElem.items.description = fhirElem.description;

      if (schemeFilePath.endsWith('Reference.schema.json')) {
        // need to make LookupObjectID[] instead of coping all fields from Reference.schema .json
        // so preserving current schema to get correct path for this.lookupRefs
        schemeFilePath = curSchemePath;
      }
      const appModelElem = this._getAppModelElem(fhirElem.items, schemeFilePath, curPath);
      // do not wrap ignored model or model with 'Mixed' type
      if (!appModelElem || appModelElem.type === 'Mixed') {
        return appModelElem;
      }
      if (appModelElem.lookup) {
        appModelElem.type = 'LookupObjectID[]';
        return appModelElem;
      }
      return this._generateArrayWrapper(appModelElem);
    }
    // if items contains only type
    const type = helper.capitalizeFirstLetter(fhirElem.items.type);
    return this._generateTypeArrayWrapper(type, curPath);
  }

  _numberElem (fhirElem, schemePath, curPath) {
    const modelElem = _.clone(fhirElem);
    modelElem.type = helper.capitalizeFirstLetter(modelElem.type);
    // add validation based on pattern field
    const {pattern} = fhirElem;
    if (pattern) {
      modelElem.validate = [this._getValidator(pattern)];
      delete modelElem.pattern;
    }
    return modelElem;
  }

  _getValidator (pattern) {
    return {
      validator: 'regex',
      arguments: {
        regex: pattern,
        regexOptions: '',
      },
      errorMessages: {default: 'Error'},
    };
  }

  /**
   * Gets relative path(root = dir) for receiving object from schemas downloaded from FHIR.
   */
  _getRefFullPath (ref, currentSchemePath) {
    let {schemePath, path} = this._getSchemePathAndPathByRef(ref);
    schemePath = schemePath || currentSchemePath;
    const schemeName = this._getSchemeNameBySchemePath(schemePath);
    const fullPath = `${schemeName}.${path}`;
    return fullPath;
  }

  // '../../fhir_resources/fhir.schema/Identifier.schema.json' -> 'Identifier'
  _getSchemeNameBySchemePath (schemePath) {
    return schemePath.substring(schemePath.lastIndexOf('/') + 1).replace('.schema.json', '');
  }

  _getLookupId (schemePath, path) {
    const schemeName = this._getSchemeNameBySchemePath(schemePath);
    return `${schemeName}${_.capitalize(path)}`;
  }

  // {'../../fhir_resources/fhir.schema/Identifier.schema.json', 'identifier'} -> 'Identifier.identifier'
  _getLookupKey (schemePath, path) {
    const schemeName = this._getSchemeNameBySchemePath(schemePath);
    return `${schemeName}.${path}`;
  }

  _getObjectByType (type) {
    if (type === 'Mixed') {
      return this._buildMixedObject();
    }
    return {};
  }

  // Get Scheme for specified scheme file and definition path.
  // For example in Patient scheme file there are Patient, Patient_Contact and other objects.
  // If definitionPath is not defined it will be parsed from schemeFilePath
  _getSchemeAppModel (schemeFilePath, definitionPath) {
    const schemeName = definitionPath || this._getSchemeNameBySchemePath(schemeFilePath);
    // console.log(`Getting app model ${schemeName}`);
    // get simplified schemes without parsing fhir schema file, because of recursive calls
    if (!this.refPath) {
      this.refPath = schemeName;
    }

    if (this.settings.alwaysIgnored.includes(schemeName)) {
      console.log(`Scheme ${schemeName} is always ignored`);
      return undefined;
    }

    // TODO: create separate method to determine is scheme included. Unify logic for throughout the app_model_generator
    if (this.refTypeMap[schemeName] && this.refTypeMap[schemeName].startsWith('DomainResource')) {
      if (this.settings.rule === 'ignore') {
        if (this.settings.ignore.includes(schemeName)) {
          console.log(`Scheme ${schemeName} is ignored`);
          return undefined;
        }
      } else if (!this.settings.include.includes(schemeName)) {
        console.log(`Scheme ${schemeName} is not included`);
        return undefined;
      }
    }

    const substituteType = this.settings.substitute[schemeName];
    if (substituteType) {
      console.log(`Scheme ${schemeName} is substituted with ${substituteType} object`);
      return this._getObjectByType(substituteType);
    }
    if (schemeName === 'Element') {
      // console.log(`Got ${schemeName} from storage`);
      return this._getElementAppModel();
    }
    if (schemeName === 'Extension') {
      // console.log(`Got ${schemeName} from storage`);
      return this._getExtensionAppModel();
    }
    if (schemeName === 'Reference') {
      // console.log(`Got ${schemeName} from storage`);
      return this._getReferenceAppModel();
    }
    // try get scheme from storage
    const storageAppModel = this.appModels[schemeName];
    if (storageAppModel) {
      // console.log(`Got ${schemeName} from storage`);
      return _.clone(storageAppModel);
    }
    console.log(`Getting app model ${schemeName}`);
    // read scheme from fhir schema file
    let schemeJson;
    try {
      schemeJson = JSON.parse(fs.readFileSync(schemeFilePath));
    } catch (e) {
      console.log(`Cannot read ${schemeFilePath}. App model for this will be '{}'`);
      this.appModels[schemeName] = {};
      return {};
    }
    const schemeDefJson = schemeJson.definitions[schemeName];
    const allOf = _.get(schemeDefJson, 'allOf');
    const refType = _.get(allOf, '[0].$ref');

    let appModel;
    let fhirModel;
    let appModelFields;
    if (refType === 'DomainResource#/definitions/DomainResource') {
      fhirModel = _.get(schemeDefJson, 'allOf[1]');
      const camelSchemeName = _.camelCase(schemeName);
      const fullName = _.startCase(schemeName);
      appModel = this._generateSchemaWrapper(camelSchemeName, fullName, fhirModel.description);
      appModelFields = _.get(appModel, `models.phis.fields[${camelSchemeName}].fields`, _.get(appModel, `models[${camelSchemeName}].fields`));
    } else if (refType === 'Element#/definitions/Element' || refType === 'BackboneElement#/definitions/BackboneElement') {
      fhirModel = _.get(schemeDefJson, 'allOf[1]');
      appModel = this._generateObjectWrapper(schemeName, fhirModel.description);
      appModelFields = appModel.fields;
    } else if (refType === 'Quantity#/definitions/Quantity') {
      // include Quantity fields into appModel. Its how 'allOf' should work initially
      const quantityAppModel = this._getSchemeAppModel('../../fhir_resources/fhir.schema/Quantity.schema.json');
      fhirModel = _.get(schemeDefJson, 'allOf[1]');
      appModel = this._generateObjectWrapper(schemeName, fhirModel.description);
      const mergedFields = _.merge(quantityAppModel.fields, appModel.fields);
      appModel.fields = mergedFields;
      appModelFields = appModel.fields;
    } else if (!allOf) { // allOf doesnt exist in ResourceList
      return {}; // TODO: resolve what to return
    } else { // no ref type in Element
      fhirModel = _.get(schemeDefJson, 'allOf[0]');
      appModel = this._generateObjectWrapper(schemeName, fhirModel.description);
      appModelFields = appModel.fields;
    }

    for (const key in fhirModel.properties) {
      // skip keys starting with '_'
      if (key.startsWith('_')) {
        continue;
      }
      const fhirElem = fhirModel.properties[key];
      const curPath = key;
      const appModelElem = this._getAppModelElem(fhirElem, schemeFilePath, curPath);
      // override description in case we have reference default description
      if (appModelElem) {
        appModelElem.description = fhirElem.description;
        appModelFields[key] = appModelElem;
      }
    }
    this.appModels[schemeName] = appModel;
    // console.log(`Saved ${schemeName} to storage`);
    return appModel;
  }

  _getElementAppModel () {
    return {
      type: 'Object',
      fullName: 'Element',
      description: 'Base definition for all elements in a resource.',
      fields: {
        id: {
          type: 'String',
          fullName: 'id',
          description: 'Unique id for the element within a resource (for internal references). This may be any string value that does not contain spaces.',
        },
        _id: {
          type: 'Mixed', // actual type is Element (avoid recursive call)
          fullName: '_id',
          description: 'Extensions for id',
        },
        extension: this._getExtensionAppModel(),
      },
    };
  }

  _getExtensionAppModel () {
    return {
      type: 'Array',
      fullName: 'Extension',
      description: 'Optional Extension Element - found in all resources.',
      fields: getExtensionFields(),
    };
  }

  _getReferenceAppModel () {
    return {
      type: 'Object',
      fullName: 'Reference',
      description: 'A reference from one resource to another.',
      fields: getReferenceFields(),
    };
  }

  _generateObjectWrapper (schemeName, description) {
    return {
      type: 'Object',
      fullName: schemeName,
      description,
      fields: {},
    };
  }

  _generateArrayWrapper (appModel) {
    return {
      type: 'Array',
      fullName: appModel.fullName,
      description: appModel.description,
      fields: appModel.fields,
    };
  }

  _generateTypeArrayWrapper (type, key) {
    // if (type === 'String') {
    //   return {
    //     type: 'Array',
    //     fullName: key,
    //     fields: {
    //       [key]: {
    //         type: 'String',
    //       }
    //     }
    //   };
    // }

    return {
      type: `${type}[]`,
      fullName: key,
    };
  }

  _generateSchemaWrapper (schemeName, fullName, description) {
    /* const originalResourceName = schemeName.substring(0, schemeName.length - 1);
    if (this.phiSchemesFlags[originalResourceName]) {
      return {
        models: {
          phis: {
            fields: {
              [schemeName]: {
                type: 'Subschema',
                fullName: schemeName,
                // "limitReturnedRecords": 30, // TODO: resolve commented fields
                // "serverSide": true,
                // "requiresAuthentication": true,
                description,
                fields: {},
              },
            },
          },
        },
      };
    } */
    return {
      models: {
        [schemeName]: {
          type: 'Schema',
          fullName,
          labelRenderer: schemeName,
          // "limitReturnedRecords": 30, // TODO: resolve commented fields
          // "serverSide": true,
          // "requiresAuthentication": true,
          description,
          fields: getDomainResourceFields(),
        },
      },
    };
  }

  _getAppModelElem (fhirElem, schemePath, curPath) {
    if (this.settings.ignoredFields.includes(curPath)) {
      return undefined;
    }

    let appModelElem;
    const {type} = fhirElem;
    if (type) {
      appModelElem = this._getAppModelElemByType(fhirElem, schemePath, curPath);
    } else {
      const ref = fhirElem.$ref;
      if (!ref) {
        const message = `No 'type', no 'ref' found for fhir elem: ${JSON.stringify(fhirElem)}`;
        console.log(message);
        return {};
      }
      const {definitionPath} = this._getSchemePathDefinitionPath(ref, schemePath);
      // add to current refPath
      this.refPath += `.${definitionPath}`;
      const appModelElemByRef = this._getAppModelElemByRef(fhirElem, schemePath, curPath);
      // change refPath to previous state
      this.refPath = this._getPrevPath();

      appModelElem = appModelElemByRef;
    }
    if (this.settings.invisibleFields.includes(curPath)) {
      appModelElem.visible = false;
    }
    return appModelElem;
  }

  _getPrevPath () {
    return this.refPath.substring(0, this.refPath.lastIndexOf('.'));
  }

  _getFirstScheme () {
    const prevPath = this._getPrevPath();
    return prevPath.indexOf('.') === -1 ? prevPath : prevPath.substring(0, prevPath.indexOf('.'));
  }

  /**
   * ref may not contain schemeName like "#/definitions/Account_Coverage", so we need current schemeName
   * fhirElem exmaple:
   * {
   *  "description": "Time period when address was/is in use.",
   *  "$ref": "Period.schema.json#/definitions/Period"
   * }
   *
   * @param fhirElem
   * @param currentSchemePath
   * @param curPath needed to determine ref lookups from lookup_refs.json
   * @returns {*}
   */
  _getAppModelElemByRef (fhirElem, currentSchemePath, curPath) {
    // console.log(`Getting by ref. fhirElem: ${JSON.stringify(fhirElem)}, currentSchemePath: ${currentSchemePath}, curPath: ${curPath}`);
    const ref = fhirElem.$ref;
    const description = fhirElem.description;
    const model = this._buildRefModel(description, ref, currentSchemePath, curPath, false);
    if (model) {
      model.description = description || model.description;
      model.fullName = helper.getFullNameByName(curPath);
    }
    return model;
  }

  /**
   *
   * @param description to fill object
   * @param ref
   * @param currentSchemeFilePath
   * @param curPath
   * @returns {{refType: *, model: ({type, fullName, description, lookup}|*)}}
   */
  _buildRefModel (description, ref, currentSchemeFilePath, curPath) {
    const lookupKey = this._getLookupKey(currentSchemeFilePath, curPath);
    const lookupRefs = _.get(this.lookupRefs, [lookupKey, 'refs']);
    // if there are lookupRefs - build lookup object
    if (lookupRefs) {
      return this._buildLookupObject(description, curPath, lookupRefs, currentSchemeFilePath, curPath);
    }

    const schemeJsonPath = this._getSchemeJsonPathFromRef(ref);
    const refType = this.refTypeMap[schemeJsonPath];
    const mainScheme = schemeJsonPath.split('_')[0];
    // check acyclic path
    const dependentSchemes = this.refGraph[schemeJsonPath] || [];
    const previousSchemes = this._getPrevPath().split('.');
    if (!this.manuallyDefinedSchemes.includes(schemeJsonPath) && previousSchemes.includes(schemeJsonPath) &&
      (dependentSchemes.includes(schemeJsonPath) || _.difference(dependentSchemes, previousSchemes).length !== 0)) {
      console.log(`Acyclic path: ${this.refPath}`);
      return this._buildMixedObject(description, schemeJsonPath);
    }
    // check simple types
    if (!refType || refType.startsWith('Element') || refType.startsWith('Quantity')) {
      return this._getSimpleScheme(ref, currentSchemeFilePath);
    }
    let newLookupRefs;
    if (refType.startsWith('DomainResource')) {
      newLookupRefs = [schemeJsonPath];
      return this._buildLookupObject(description, curPath, newLookupRefs, currentSchemeFilePath, curPath);
    } else if (refType.startsWith('BackboneElement')) {
      return this._getSimpleScheme(ref, currentSchemeFilePath);
    }
  }

  _buildMixedObject (description, fullName) {
    return {
      type: 'Mixed',
      fullName,
      description,
    };
  }

  _getSimpleScheme (ref, currentSchemeFilePath) {
    const {schemeFilePath, definitionPath} = this._getSchemePathDefinitionPath(ref, currentSchemeFilePath);
    return this._getSchemeAppModel(schemeFilePath, definitionPath);
  }

  // 'Identifier.schema.json#/definitions/Identifier' -> Identifier
  _getSchemeJsonPathFromRef (ref) {
    return ref.substring(ref.lastIndexOf('/') + 1);
  }

  // {'Identifier.schema.json#/definitions/Identifier', '../../fhir_resources/fhir.schema/Account.schema.json'} ->
  // {'../../fhir_resources/fhir.schema/Identifier.schema.json', 'Identifier'}
  _getSchemePathDefinitionPath (ref, currentSchemePath) {
    const {schemePath, path} = this._getSchemePathAndPathByRef(ref);
    let filename;
    if (!schemePath) {
      filename = currentSchemePath.substring(currentSchemePath.lastIndexOf('/') + 1);
    } else {
      filename = schemePath;
    }
    const schemeFilePath = `${this.schemeDir}/${filename}`;
    const definitionPath = path.replace('definitions.', '');
    return {schemeFilePath, definitionPath};
  }

  _getSchemePathByRef (ref, currentSchemePath) {
    const {schemePath} = this._getSchemePathAndPathByRef(ref);
    let filename;
    if (!schemePath) {
      filename = currentSchemePath.substring(currentSchemePath.lastIndexOf('/') + 1);
    } else {
      filename = schemePath;
    }
    return `${this.schemeDir}/${filename}`;
  }

  _getSchemePathAndPathByRef (ref) {
    let [schemePath, path] = ref.split('#');
    path = path.substring(1).replace('/', '.'); // '/definitions/CodeableConcept' -> 'definitions.CodeableConcept'
    return {schemePath, path};
  }

  _buildLookupObject (description, fullName, lookupRefs, currentSchemeFilePath, curPath) {
    const table = {};
    _.forEach(lookupRefs, (lookupRef) => {
      const lookupSchemePath = this._getSchemePathBySchemeName(lookupRef);
      // Need to rework getShemeAppModel in case of cyclic refs.
      // It should get all simple types, write it to memory, then handle refs type. In this case we can get simple types from memory
      // For example Organization.partOf is referred to Organization
      // Currently read scheme from file
      let fhirScheme;
      try {
        fhirScheme = JSON.parse(fs.readFileSync(lookupSchemePath));
      } catch (e) {
        fhirScheme = {};
        console.log(`Cannot read ${lookupSchemePath}. Lookup scheme for this will be '{}'`);
      }
      const lookupScheme = _.get(fhirScheme, `definitions[${lookupRef}].allOf[1].properties`, {});
      // const lookupScheme = this._getSchemeAppModel(lookupSchemePath);
      if (Object.keys(this.settings.substitute).includes(lookupRef)) {
        console.log(`Lookup entry ${lookupRef} is omitted, because its included in settings 'substitute' section`);
        return;
      }
      if (this.settings.alwaysIgnored.includes(lookupRef)) {
        console.log(`Lookup entry ${lookupRef} is omitted, because its included in settings 'alwaysIgnored' section`);
        return;
      }
      if (this.settings.rule === 'ignore' && this.settings.ignore.includes(lookupRef)) {
        console.log(`Lookup entry ${lookupRef} is omitted, because its included in settings 'ignore' section`);
        return;
      }
      if (this.settings.rule === 'include' && !this.settings.include.includes(lookupRef)) {
        console.log(`Lookup entry ${lookupRef} is omitted, because its not included in settings 'include' section`);
        return;
      }
      const camelSchemeName = _.camelCase(lookupRef);
      // currently we have only schemas
      // const fullPathScheme = this.phiSchemesFlags[lookupRef] ? `phis.${camelSchemeName}` : pluralSchemeName;
      const fullPathScheme = camelSchemeName;
      table[fullPathScheme] = {
        foreignKey: 'id', // this is fhir_id, not mongo_id
        label: this._getLabelFieldByScheme(lookupScheme), // need to determine how to get this field
      };
    });
    const lookupId = this._getLookupId(currentSchemeFilePath, curPath);
    if (!Object.keys(table).length) {
      console.log(`Lookup for ${lookupId} is omitted, because it has no lookup entries`);
      return undefined;
    }

    const lookupKey = this._getLookupKey(currentSchemeFilePath, curPath);
    const lookupRef = this.lookupRefs[lookupKey];
    if (!lookupRef) {
      throw new Error(`No lookup ref found for key ${lookupKey}`);
    }
    return {
      type: lookupRef.isMultiple ? 'LookupObjectID[]' : 'LookupObjectID',
      required: lookupRef.required,
      fullName,
      description,
      lookup: {
        table,
        id: lookupId,
      },
    };
  }

  // 'Account' -> '../../fhir_resources/fhir.schema/Account.schema.json'
  _getSchemePathBySchemeName (schemeName) {
    return `${this.schemeDir}/${schemeName}.schema.json`;
  }

  _isFieldIncluded (scheme, fieldName) {
    if (this.settings.ignoredFields.includes(fieldName)) {
      return false;
    }

    const field = scheme[fieldName];
    if (!field) {
      return false;
    }

    const ref = _.get(field, 'items.$ref');
    if (!ref) {
      return true;
    }
    const refSchemaName = ref.substring(ref.lastIndexOf('/') + 1);
    if (this.settings.rule === 'ignore') {
      if (this.settings.ignore.includes(refSchemaName)) {
        return false;
      }
    } else if (!this.settings.include.includes(refSchemaName)) {
      return false;
    }
    return true;
  }

  /**
   * For lookup labels please use try the following options in this order:
   * name
   * title
   * // first available field of type String (skipped for now, not user-friendly labels)
   * _id
   */
  _getLabelFieldByScheme (scheme) {
    if (this._isFieldIncluded(scheme, 'name')) {
      return 'name';
    }
    if (this._isFieldIncluded(scheme, 'title')) {
      return 'title';
    }

    // for (const [key, value] of Object.entries(scheme)) {
    //   if (value.type === 'string' && this._isFieldIncluded(scheme, key)) {
    //     return key;
    //   }
    // }

    return 'id';
  }

  _getSchemeRefTypes () {
    const schemePaths = glob.sync(`${this.schemeDir}/**/*.json`);
    const refTypeMap = {};
    _.forEach(schemePaths, (schemePath) => {
      let schemeJson;
      try {
        // const schemeName = this._getSchemeNameBySchemePath(schemePath);
        schemeJson = JSON.parse(fs.readFileSync(schemePath));
        _.forEach(schemeJson.definitions, (definitionJson, definitionName) => {
          const allOf = _.get(definitionJson, 'allOf');
          const refType = _.get(allOf, '[0].$ref');
          // console.log(`${definitionName} - ${refType}`);
          refTypeMap[definitionName] = refType;
        });
      } catch (e) {
        console.log(`Error occurred ${e}`);
      }
    });
    // const refsTypesOutputPath = '../../services/gen_app_model_by_fhir/generated/scheme_refs_types.json';
    // fs.writeFileSync(refsTypesOutputPath, JSON.stringify(refTypeMap, null, 2));
    return refTypeMap;
  }

  traverseSchemes () {
    const schemePaths = glob.sync(`${this.schemeDir}/**/*.json`);
    _.forEach(schemePaths, (schemePath) => {
      this.refPath = '';
      // const schemeName = this._getSchemeNameBySchemePath(schemePath);
      const appModel = this._getSchemeAppModel(schemePath);
      this._injectOwnRecordPermissionForModel(appModel);
      this._injectOwnRecordPermissionForLookups(appModel);
      this._transformArrayListToObjectWithUserPermissions(appModel);
      this._renameFieldsDueToMongoose(appModel);
    });
    console.log(`---- Done traversing schemes.\n`);
  }

  writeSchemes (path) {
    _.forEach(this.appModels, (appModel) => {
      if (appModel.models) {
        const jsonPath = _.get(appModel, 'models.phis.fields', _.get(appModel, 'models'));
        const schemaName = _.keys(jsonPath)[0];
        const fullPath = `${path}/5_${schemaName}.json`;
        let appModelString;
        // workaround for a very long string (need to rework with stream)
        try {
          appModelString = JSON.stringify(appModel, null, 2);
        } catch (e) {
          appModelString = JSON.stringify(appModel);
        }
        fs.writeFileSync(fullPath, appModelString);
        console.log(`Created ${fullPath}`);
      }
    });
    console.log(`---- Done writing schemes.\n`);
  }

  deleteSchemes (schemesPath) {
    const schemeJsonFiles = glob.sync(`${schemesPath}/5_*.json`);
    schemeJsonFiles.forEach((schemeFile) => {
      fs.unlinkSync(schemeFile);
      console.log(`Deleted ${schemeFile}`);
    });
    console.log(`---- Done deleting schemes.\n`);
  }

  writeRefsGraph (path) {
    fs.writeFileSync(path, JSON.stringify(this.refGraph, null, 2));
  }

  /**
   * Mongoose has a special field 'type'. This field should be renamed to pass generated objects to mongoose.
   * More info - https://github.com/Automattic/mongoose/issues/2104
   * @param appModel
   */
  _renameFieldsDueToMongoose (appModel) {
    const model = _.get(appModel, 'models') ? Object.values(appModel.models)[0] : appModel;
    if (model) {
      renameFields(model);
    }

    function renameFields (obj) {
      _.forEach(obj.fields, (field, fieldName) => {
        if (fieldName === 'type' && _.isPlainObject(obj.fields.type)) {
          obj.fields.Type = obj.fields.type;
          delete obj.fields.type;
        }
        renameFields(field);
      });
    }
  }

  _transformArrayListToObjectWithUserPermissions (appModel) {
    const model = _.get(appModel, 'models') ? Object.values(appModel.models)[0] : appModel;
    if (model) {
      transformList(model);
    }

    function transformList (obj) {
      _.forEach(obj.fields, (field, fieldName) => {
        if (_.isArray(field.list)) {
          const values = _.reduce(field.list, (res, val) => {
            res[val] = val;
            return res;
          }, {});
          obj.fields[fieldName].list = {
            values,
            scopes: {
              userScope: {
                permissions: 'accessAsUser',
                where: 'return true',
                return: 'return $list',
              },
            },
          };
        }
        transformList(field);
      });
    }
  }

  _injectOwnRecordPermissionForModel (appModel) {
    if (!appModel) return;

    const model = _.get(appModel, 'models') ? Object.values(appModel.models)[0] : appModel;
    if (model.type === 'Schema') {
      model.scopes = this._getOwnRecordScope();
      model.actions = {
        fields: {
          update: {permissions: 'accessAsUser'},
          delete: {permissions: 'accessAsUser'},
          clone: {permissions: 'accessAsUser'},
          viewDetails: {permissions: 'accessAsUser'},
          view: {permissions: 'accessAsUser'},
          create: {permissions: 'accessAsUser'},
        },
      };
    }
  }

  _getOwnRecordScope () {
    return {
      ownRecordScope: {
        permissions: 'accessAsUser',
        where: '{$eq: [\'$creator._id\', this.req.user._id]}',
      },
    };
  }

  _injectOwnRecordPermissionForLookups (appModel) {
    if (!appModel) return;

    const model = _.get(appModel, 'models') ? Object.values(appModel.models)[0] : appModel;
    if (model.type === 'Schema') {
      _.forEach(model.fields, (obj) => {
        if (obj.type === 'LookupObjectID' || obj.type === 'LookupObjectID[]') {
          _.forEach(obj.lookup.table, (table) => {
            table.scopes = this._getOwnRecordScope();
          });
        }
      });
    }
  }
}

module.exports = AppModelGenerator;
