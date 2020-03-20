const { schemaComposer } = require('graphql-compose');
const _ = require('lodash');
const { getLookupType, getTreeSelectorType } = require('./lookup');
const { COMPOSER_TYPES, MongoIdScalarTC, isInputType, getLocationType } = require('./common');

function resolveGraphQLType(field, modelName, fieldPath, composerType) {
  if (!field.showInGraphql) {
    return;
  }
  const type = field.type.replace('[]', '');
  if (type === 'Group') {
    return;
  }

  let graphqlType;
  if (type === ['Date', 'Time', 'DateTime']) {
    graphqlType = 'Date';
  } else if (
    [
      'String',
      'Barcode',
      'ObjectID',
      'Password',
      'Email',
      'Phone',
      'Url',
      'Text',
      'Decimal128',
      'Html',
      'Code',
    ].includes(type)
  ) {
    graphqlType = 'String';
  } else if (type === 'Boolean') {
    graphqlType = 'Boolean';
  } else if (['Number', 'ImperialWeight', 'BloodPressure', 'Double', 'Int32', 'Int64'].includes(type)) {
    graphqlType = 'Float';
  } else if (['ImperialHeight', 'ImperialWeightWithOz'].includes(type)) {
    graphqlType = '[Float]';
  } else if (type === 'Location') {
    graphqlType = getLocationType(composerType);
  } else if (type === 'LookupObjectID') {
    graphqlType = getLookupType(field, modelName, fieldPath, composerType);
  } else if (type === 'TreeSelector') {
    graphqlType = getTreeSelectorType(field, modelName, fieldPath, composerType);
  } else if (type === 'Object') {
    graphqlType = getObjectType(field, modelName, fieldPath, composerType);
  } else if (type === 'Array') {
    graphqlType = getArrayType(field, modelName, fieldPath, composerType);
  } else {
    graphqlType = 'JSON';
  }

  const isArray = field.type.endsWith('[]');
  const isSdlFormat = _.isString(graphqlType);
  if (isArray) {
    if (isSdlFormat) {
      graphqlType = `[${graphqlType}]`;
    } else {
      graphqlType = graphqlType.getTypePlural();
    }
  }

  // Output types should not have required fields due to field permissions
  // Required field may be erased by permissions. In this case user should still be able to get records.
  const isRequired = field.required === true;
  if (isRequired && isInputType(composerType)) {
    if (isSdlFormat) {
      graphqlType += '!';
    } else {
      graphqlType = graphqlType.getTypeNonNull();
    }
  }
  return graphqlType;
}

function getObjectType(field, modelName, fieldPath, composerType) {
  const objTypePath = `${modelName}_${fieldPath.join('_')}`;
  const typeName = getTypeName(objTypePath, composerType);
  const objType = isInputType(composerType)
    ? schemaComposer.createInputTC(typeName)
    : schemaComposer.createObjectTC(typeName);
  _.forEach(field.fields, (val, name) => {
    const fieldConfig = resolveGraphQLType(val, modelName, fieldPath.concat(name), composerType);
    fieldConfig && objType.setField(name, fieldConfig);
  });
  return objType;
}

function getArrayType(field, modelName, fieldPath, composerType) {
  const objTypePath = `${modelName}_${fieldPath.join('_')}`;
  const typeName = getTypeName(objTypePath, composerType);
  const objType = isInputType(composerType)
    ? schemaComposer.createInputTC(typeName)
    : schemaComposer.createObjectTC(typeName);
  _.forEach(field.fields, (val, name) => {
    const fieldConfig = resolveGraphQLType(val, modelName, fieldPath.concat(name), composerType);
    fieldConfig && objType.setField(name, fieldConfig);
  });
  // each object in Array has '_id' field
  objType.setField('_id', 'ID');

  return objType.getTypePlural();
}

function getTypeName(modelName, composerType) {
  const { INPUT, INPUT_WITHOUT_ID, OUTPUT_WITH_ACTIONS, OUTPUT } = COMPOSER_TYPES;
  if (composerType === OUTPUT) {
    return modelName;
  }
  if ([INPUT, INPUT_WITHOUT_ID, OUTPUT_WITH_ACTIONS].includes(composerType)) {
    return `${modelName}${composerType}`;
  }
  throw new Error(`Invalid composerType: ${composerType}`);
}

function createTypeByModel(model, modelName, composerType, typeName) {
  const config = {
    name: typeName || getTypeName(modelName, composerType),
    fields: {},
  };
  _.forEach(model.fields, (field, fieldName) => {
    const fieldConfig = resolveGraphQLType(field, modelName, [fieldName], composerType);
    if (fieldConfig) {
      config.fields[fieldName] = fieldConfig;
    }
  });
  if (composerType === COMPOSER_TYPES.OUTPUT_WITH_ACTIONS) {
    config.fields._actions = 'JSON';
  }
  if (composerType !== COMPOSER_TYPES.INPUT_WITHOUT_ID) {
    config.fields._id = MongoIdScalarTC;
  }

  // it overrides type with name=config.name if exists
  return isInputType(composerType) ? schemaComposer.createInputTC(config) : schemaComposer.createObjectTC(config);
}

/**
 * @param model
 * @param modelName
 * @param composerType
 * @returns {NamedTypeComposer<any>}
 */
function getOrCreateTypeByModel(model, modelName, composerType) {
  const typeName = getTypeName(modelName, composerType);
  if (schemaComposer.has(typeName)) {
    return schemaComposer.get(typeName);
  }
  return createTypeByModel(model, modelName, composerType, typeName);
}

function generateOutputAndInputTypesByModel(model, modelName) {
  getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT);
  getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT_WITH_ACTIONS);
  getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.INPUT);
  getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.INPUT_WITHOUT_ID);
}

function getInputModelType(modelName) {
  return schemaComposer.getITC(getTypeName(modelName, COMPOSER_TYPES.INPUT));
}

module.exports = {
  generateOutputAndInputTypesByModel,
  createTypeByModel,
  getOrCreateTypeByModel,
  getInputModelType,
};
