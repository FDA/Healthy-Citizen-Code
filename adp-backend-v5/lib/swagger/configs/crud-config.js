const _ = require('lodash');

function getCrudRoutesConfig(models) {
  const tags = [];
  const paths = {};
  const definitions = {};
  _.each(models, (schema, schemaName) => {
    tags.push({ name: schemaName });
    const schemaDefinition = getSchemaDefinition(schema);
    definitions[schemaName] = schemaDefinition;

    const schemaPath = `/schema/${schemaName}`;
    paths[schemaPath] = {
      get: getSchemaSwagger(schema, schemaName),
    };

    const path = `/${schemaName}`;
    paths[path] = {
      get: getItemsSwagger(schema, schemaName),
      post: postItemSwagger(schema, schemaName),
    };

    const pathWithId = `/${schemaName}/{id}`;
    paths[pathWithId] = {
      get: getItemSwagger(schema, schemaName),
      put: putItemSwagger(schema, schemaName),
      delete: deleteItemSwagger(schema, schemaName),
    };
  });
  return { tags, paths, definitions };
}

function getSchemaSwagger(schema, schemaName) {
  return {
    summary: `Gets ${schemaName} schema`,
    tags: [schemaName],
    produces: ['application/json'],
    security: [
      {
        User: [],
      },
    ],
    parameters: [],
    responses: {
      '200': {
        description: `Returns schema`,
      },
      '400': {
        description: `Returns error. Message is sent in 'message' field`,
      },
    },
  };
}

function getItemsSwagger(schema, schemaName) {
  const { limitReturnedRecords } = schema;
  const maxLimitMessage = limitReturnedRecords ? ` Maximum value is ${limitReturnedRecords}` : '';

  return {
    summary: `Gets ${schemaName} records`,
    tags: [schemaName],
    produces: ['application/json'],
    security: [
      {
        User: [],
      },
    ],
    parameters: [
      {
        in: 'query',
        name: 'length',
        description: `Limits amount of records to return.${maxLimitMessage}`,
        schema: {
          type: 'string',
        },
        required: false,
      },
      {
        in: 'query',
        name: 'start',
        description: 'Skips amount of records from the whole result. (0 by default)',
        schema: {
          type: 'string',
        },
        required: false,
      },
      {
        in: 'query',
        name: 'q',
        description: 'Text to search in record fields.',
        schema: {
          type: 'string',
        },
        required: false,
      },
    ],
    responses: {
      '200': {
        description: `Returns matched records in 'data' field`,
      },
      '400': {
        description: `Returns error. Message is sent in 'message' field`,
      },
    },
  };
}

function getItemSwagger(schema, schemaName) {
  return {
    summary: `Gets ${schemaName} record by id`,
    tags: [schemaName],
    produces: ['application/json'],
    security: [
      {
        User: [],
      },
    ],
    parameters: [
      {
        in: 'path',
        name: 'id',
        required: true,
        type: 'string',
      },
      {
        in: 'query',
        name: 'q',
        description: 'Text to search in record fields.',
        schema: {
          type: 'string',
        },
        required: false,
      },
    ],
    responses: {
      '200': {
        description: `Returns matched record in 'data' field`,
      },
      '400': {
        description: `Returns error. Message is sent in 'message' field`,
      },
    },
  };
}

function putItemSwagger(schema, schemaName) {
  return {
    summary: `Updates ${schemaName} record by id`,
    tags: [schemaName],
    produces: ['application/json'],
    security: [
      {
        User: [],
      },
    ],
    parameters: [
      {
        in: 'path',
        name: 'id',
        required: true,
        type: 'string',
      },
      {
        in: 'body',
        name: schemaName,
        description: `${schemaName} to create`,
        required: true,
        schema: {
          $ref: `#/definitions/${schemaName}`,
        },
      },
    ],
    responses: {
      '200': {
        description: `Returns id of updated record`,
      },
      '400': {
        description: `Returns error. Message is sent in 'message' field`,
      },
    },
  };
}

function deleteItemSwagger(schema, schemaName) {
  return {
    summary: `Deletes ${schemaName} record by id with assigned linked records`,
    tags: [schemaName],
    produces: ['application/json'],
    security: [
      {
        User: [],
      },
    ],
    parameters: [
      {
        in: 'path',
        name: 'id',
        required: true,
        type: 'string',
      },
    ],
    responses: {
      '200': {
        description: `Returns matched record in 'data' field`,
      },
      '400': {
        description: `Returns error. Message is sent in 'message' field.
If error related with linked records additional info is sent in 'info' field`,
      },
    },
  };
}

function postItemSwagger(schema, schemaName) {
  return {
    summary: `Creates new ${schemaName} record`,
    tags: [schemaName],
    produces: ['application/json'],
    security: [
      {
        User: [],
      },
    ],
    parameters: [
      {
        in: 'body',
        name: schemaName,
        description: `${schemaName} to create`,
        required: true,
        schema: {
          $ref: `#/definitions/${schemaName}`,
        },
      },
    ],
    responses: {
      '200': {
        description: `Returns id of created record`,
      },
      '400': {
        description: `Returns error. Message is sent in 'message' field`,
      },
    },
  };
}

function getSingleTypeDefinition(type) {
  if (type === 'String' || type === 'Barcode' || type === 'ObjectID') {
    return { type: 'string' };
  }
  if (type === 'Date') {
    return { type: 'string', format: 'date' };
  }
  if (type === 'Boolean') {
    return { type: 'boolean' };
  }
  if (type === 'Mixed') {
    return { type: 'object', properties: {} };
  }
  if (type === 'LookupObjectID') {
    return {
      type: 'object',
      properties: {
        _id: {
          type: 'string', // actually it can be not only string but boolean or number as well
        },
        table: {
          type: 'string',
        },
        label: {
          type: 'string',
        },
      },
    };
  }

  return { type: 'object' };
}

function getFieldDefinition(field) {
  const { type } = field;
  if (type !== 'Schema' && field.showInForm !== true) {
    return;
  }
  const singleType = type.replace('[]', '');
  const isObject = singleType === 'Object' || type === 'Schema' || type === 'Array';
  const isArray = type.endsWith('[]') || type === 'Array';

  let itemDefinition;
  if (isObject) {
    itemDefinition = { type: 'object', properties: {}, required: [] };
    _.each(field.fields, (nestedField, nestedFieldName) => {
      const nestedFieldDefinition = getFieldDefinition(nestedField);
      if (nestedFieldDefinition) {
        itemDefinition.properties[nestedFieldName] = nestedFieldDefinition;
        if (nestedField.required === true) {
          itemDefinition.required.push(nestedFieldName);
        }
      }
    });
  } else {
    itemDefinition = getSingleTypeDefinition(singleType);
  }
  if (_.isString(field.required)) {
    itemDefinition.description = `This field is conditionally required`;
  }

  let fieldDefinition;
  if (isArray) {
    fieldDefinition = {
      type: 'array',
      items: itemDefinition,
    };
  } else {
    fieldDefinition = itemDefinition;
  }

  return fieldDefinition;
}

function getSchemaDefinition(schema) {
  // schema can be considered as an Object field
  return getFieldDefinition(schema);
}

module.exports = { getCrudRoutesConfig };
