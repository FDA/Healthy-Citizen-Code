const { schemaComposer } = require('graphql-compose');
const _ = require('lodash');
const { getLookupType, getTreeSelectorType } = require('./lookup');
const { COMPOSER_TYPES, MongoIdScalarTC, isInputType, getLocationType, getOrCreateEnum } = require('./common');

function resolveGraphQLType(field, modelName, fieldPath, composerType) {
  if (!field.showInGraphql) {
    return;
  }
  const type = field.type.replace('[]', '');
  if (['Group', 'StaticHtml'].includes(type)) {
    return;
  }

  let graphqlType;

  if (
    [
      'String',
      'Barcode',
      'Password',
      'Email',
      'Phone',
      'Url',
      'Text',
      'Decimal128',
      'Html',
      'Code',
      'CronExpression',
    ].includes(type)
  ) {
    graphqlType = 'String';
  } else if (type === 'ObjectID') {
    graphqlType = MongoIdScalarTC;
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

function getObjectTCName(modelName, fieldPath, composerType) {
  const objTypePath = `${modelName}_${fieldPath.join('_')}`;
  return getTypeName(objTypePath, composerType);
}

function getObjectTCNameForUpdateMany(modelName, fieldPath, composerType) {
  const objTypePath = `${modelName}_${fieldPath.join('_')}UpdateManyObj`;
  const typeName = getTypeName(objTypePath, composerType);
  return `${typeName}_`;
}

function getObjectType(field, modelName, fieldPath, composerType) {
  const typeName = getObjectTCName(modelName, fieldPath, composerType);
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
  const typeName = getObjectTCName(modelName, fieldPath, composerType);
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
  if (!_.values(COMPOSER_TYPES).includes(composerType)) {
    throw new Error(`Invalid composerType: ${composerType}`);
  }

  if (composerType === COMPOSER_TYPES.OUTPUT) {
    return modelName;
  }
  return `${modelName}${composerType}`;
}

function getBaseTypeDef(model, modelName, composerType, typeName) {
  return {
    name: typeName || getTypeName(modelName, composerType),
    fields: {},
  };
}

function addFieldsToTypeDef(typeDef, model, modelName, composerType) {
  _.forEach(model.fields, (field, fieldName) => {
    const fieldConfig = resolveGraphQLType(field, modelName, [fieldName], composerType);
    if (fieldConfig) {
      typeDef.fields[fieldName] = fieldConfig;
    }
  });
  return typeDef;
}

const typeBuilders = {
  [COMPOSER_TYPES.INPUT]: (model, modelName, typeName) => {
    const composerType = COMPOSER_TYPES.INPUT;
    const typeDef = getBaseTypeDef(model, modelName, composerType, typeName);
    addFieldsToTypeDef(typeDef, model, modelName, composerType);

    return schemaComposer.createInputTC(typeDef);
  },
  [COMPOSER_TYPES.INPUT_WITHOUT_ID]: (model, modelName, typeName) => {
    const composerType = COMPOSER_TYPES.INPUT_WITHOUT_ID;
    const typeDef = getBaseTypeDef(model, modelName, composerType, typeName);
    addFieldsToTypeDef(typeDef, model, modelName, composerType);
    delete typeDef.fields._id;

    return schemaComposer.createInputTC(typeDef);
  },
  [COMPOSER_TYPES.INPUT_UPDATE_MANY]: (model, modelName, typeName) => {
    const composerType = COMPOSER_TYPES.INPUT_UPDATE_MANY;
    const typeDef = getBaseTypeDef(model, modelName, composerType, typeName);

    const fieldActionType = getOrCreateEnum('fieldAction', ['delete', 'update', 'doNotChange']);
    _.forEach(model.fields, (field, fieldName) => {
      const fieldConfig = resolveGraphQLType(field, modelName, [fieldName], composerType);
      if (!fieldConfig) {
        return;
      }
      if (fieldName === '_id') {
        typeDef.fields[fieldName] = fieldConfig.getTypeNonNull();
      } else {
        typeDef.fields[fieldName] = schemaComposer.createInputTC({
          name: getObjectTCNameForUpdateMany(modelName, [fieldName], composerType),
          fields: {
            value: fieldConfig,
            action: fieldActionType,
          },
        });
      }
    });

    return schemaComposer.createInputTC(typeDef).getTypePlural();
  },
  [COMPOSER_TYPES.OUTPUT]: (model, modelName, typeName) => {
    const composerType = COMPOSER_TYPES.OUTPUT;
    const typeDef = getBaseTypeDef(model, modelName, composerType, typeName);
    addFieldsToTypeDef(typeDef, model, modelName, composerType);

    return schemaComposer.createObjectTC(typeDef);
  },
  [COMPOSER_TYPES.OUTPUT_WITH_ACTIONS]: (model, modelName, typeName) => {
    const composerType = COMPOSER_TYPES.OUTPUT;
    const typeDef = getBaseTypeDef(model, modelName, composerType, typeName);
    addFieldsToTypeDef(typeDef, model, modelName, composerType);
    typeDef.fields._actions = 'JSON';

    return schemaComposer.createObjectTC(typeDef);
  },
};

function createType(model, modelName, composerType, typeName) {
  const typeBuilder = typeBuilders[composerType];
  if (!typeBuilder) {
    throw new Error(`Invalid composerType ${composerType}`);
  }
  return typeBuilder(model, modelName, typeName);
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

const { createPaginationTC } = require('../pagination/preparePaginationType');

function updateOutputAndInputTypesByModel(model, modelName) {
  createTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT);
  createTypeByModel(model, modelName, COMPOSER_TYPES.INPUT);
  createTypeByModel(model, modelName, COMPOSER_TYPES.INPUT_WITHOUT_ID);

  const outputWithActionsType = createTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT_WITH_ACTIONS);
  createPaginationTC(outputWithActionsType);
}

module.exports = {
  updateOutputAndInputTypesByModel,
  createTypeByModel,
  getOrCreateTypeByModel,
};
