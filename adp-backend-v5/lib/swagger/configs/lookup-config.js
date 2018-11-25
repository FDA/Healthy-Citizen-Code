const _ = require('lodash');

function getBaseLookup() {
  return {
    tags: ['Lookup'],
    produces: ['application/json'],
    security: [
      {
        User: [],
      },
    ],
    parameters: [
      {
        in: 'query',
        name: 'page',
        description:
          'Page number (default 0). Number of results per page is set in schema and cannot be changed.',
        schema: {
          type: 'string',
        },
      },
      {
        in: 'query',
        name: 'q',
        description: 'Text to search in lookup fields.',
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

function addRoutes(lookup, lookupId, paths) {
  const baseLookup = getBaseLookup();

  _.forEach(lookup.table, tableLookup => {
    const isFilteringLookup = tableLookup.where;
    const tableName = tableLookup.table;
    const lookupPath = `/lookups/${lookupId}/${tableName}`;
    paths[lookupPath] = {};
    if (!isFilteringLookup) {
      paths[lookupPath] = {
        get: {
          ...baseLookup,
          summary: `Gets record from ${tableName} for lookup ${lookupId}`,
        },
      };
    } else {
      paths[lookupPath] = {
        post: {
          ...baseLookup,
          summary: `Gets record from ${tableName} for lookup ${lookupId}`,
          description:
            'POST request is used to send form data for filtering lookup records based on user input',
        },
      };
      paths[lookupPath].post.parameters.push({
        in: 'body',
        name: 'formData',
        description: `Current form data as an object in format according to scheme`,
      });
    }
  });
}

function addLookupsForSchema(schema, paths) {
  _.each(schema, (attribute, attributeName) => {
    if (attributeName === 'lookup' && _.isPlainObject(attribute)) {
      const lookup = attribute;
      const lookupId = lookup.id;
      addRoutes(lookup, lookupId, paths);
    }
    if (attributeName === 'fields' && _.isPlainObject(attribute)) {
      _.each(attribute, field => {
        addLookupsForSchema(field, paths);
      });
    }
  });
}

function getLookupConfig(models) {
  const paths = {};
  _.each(models, schema => {
    addLookupsForSchema(schema, paths);
  });
  return { paths };
}

module.exports = { getLookupConfig };
