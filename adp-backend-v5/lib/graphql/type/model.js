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

  if (
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
  } else if (['Date', 'Time', 'DateTime'].includes(type)) {
    graphqlType = 'Date';
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
  } else if (['Mixed', 'File', 'Image', 'Video', 'Audio'].includes(type)) {
    graphqlType = 'JSON';
  } else if (type === 'AssociativeArray') {
    // getObjectType is used to generate nested lookups/treeselectors Queries
    getObjectType(field, modelName, fieldPath, composerType);
    graphqlType = 'JSON';
  } else {
    // TODO: log/warning fallback type?
    graphqlType = 'JSON';
  }

  const isMultiple = field.type.endsWith('[]');
  const isSdlFormat = _.isString(graphqlType);
  if (isMultiple) {
    if (isSdlFormat) {
      graphqlType = `[${graphqlType}]`;
    } else {
      graphqlType = graphqlType.getTypePlural();
    }
  }

  // Do NOT handle required since we have neither string nor boolean values.
  // String required is impossible to implement in graphql.
  // Boolean required is in conflict when field is simultaneously required and read-only. When value for such field is empty graphql will not pass request further to resolver.
  // Moreover thrown required message is more precise than default graphql message since it's modifiable via app schema.

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

function createType(model, modelName, composerType, typeName) {
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

function getOrCreateTypeByModel(model, modelName, composerType) {
  const typeName = getTypeName(modelName, composerType);
  if (schemaComposer.has(typeName)) {
    return schemaComposer.get(typeName);
  }
  return createType(model, modelName, composerType, typeName);
}

function createTypeByModel(model, modelName, composerType) {
  const typeName = getTypeName(modelName, composerType);
  return createType(model, modelName, composerType, typeName);
}

function updateOutputAndInputTypesByModel(model, modelName) {
  createTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT);
  createTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT_WITH_ACTIONS);
  createTypeByModel(model, modelName, COMPOSER_TYPES.INPUT);
  createTypeByModel(model, modelName, COMPOSER_TYPES.INPUT_WITHOUT_ID);
}

module.exports = {
  updateOutputAndInputTypesByModel,
  createTypeByModel,
  getOrCreateTypeByModel,
};
