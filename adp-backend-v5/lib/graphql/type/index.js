const { TypeComposer } = require('graphql-compose');
const _ = require('lodash');
// const { ObjectID } = require('mongodb');

const lookupObjectIDType = `type LookupObjectID {
    _id: String!
    table: String!
    label: String!
  }
  `;

function resolveGraphQLType(field) {
  if (!field.showInGraphQL) {
    return;
  }
  const type = field.type.replace('[]', '');
  let graphqlType;

  if (type === 'Date') {
    graphqlType = 'Date';
  } else if (type === 'String') {
    graphqlType = 'String';
  } else if (type === 'ObjectID') {
    graphqlType = 'String';
  } else if (type === 'Boolean') {
    graphqlType = 'Boolean';
  } else if (type === 'Number') {
    // TODO: resolve Number as Int or Float
    graphqlType = 'Float';
  } else if (type === 'LookupObjectID') {
    graphqlType = lookupObjectIDType;
    // graphqlType = 'JSON';
  } else if (type === 'Object') {
    graphqlType = TypeComposer.create(_.camelCase(field.fullName));
    _.forEach(field.fields, (fieldVal, fieldName) => {
      const fieldConfig = resolveGraphQLType(fieldVal);
      fieldConfig && graphqlType.setField(fieldName, fieldConfig);
    });
  } else {
    graphqlType = 'JSON!';
    // graphqlType = GraphQLJSON;
  }

  const isArray = field.type.endsWith('[]');
  if (isArray) {
    if (_.isString(graphqlType)) {
      graphqlType = `[${graphqlType}]`;
    } else {
      graphqlType = graphqlType.getTypePlural();
    }
  }

  const isRequired = field.required === true;
  if (isRequired) {
    graphqlType += '!';
  }
  return graphqlType;
}

function generateTypeByModel(model, modelName) {
  const config = {
    name: modelName,
    fields: { _id: 'ID' },
  };
  _.forEach(model.fields, (field, fieldName) => {
    const fieldConfig = resolveGraphQLType(field);
    if (fieldConfig) {
      config.fields[fieldName] = fieldConfig;
    }
  });

  return TypeComposer.create(config);
}

module.exports = {
  generateTypeByModel,
};
