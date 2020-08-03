const { schemaComposer } = require('graphql-compose');
const log = require('log4js').getLogger('graphql/treeselector-resolver');
const JSON5 = require('json5');
const { handleGraphQlError, filterReviver } = require('../util');

const validateFilterResolverName = 'validateFilter';

function getValidateFilterResolver() {
  return schemaComposer.createResolver({
    kind: 'query',
    name: validateFilterResolverName,
    args: {
      filter: schemaComposer
        .createInputTC({
          name: 'MongoOrDxQueryInput',
          fields: {
            mongoQuery: { type: 'String' },
            dxQuery: { type: 'String' },
          },
        })
        .getTypeNonNull(),
      modelName: 'String!',
    },
    type: schemaComposer.createObjectTC({
      name: 'validateFilterResponse',
      fields: {
        isValidFilter: 'Boolean',
        errors: 'JSON',
      },
    }),
    resolve: async ({ args, context }) => {
      const { appLib } = context;
      const { db, dba, filterParser } = appLib;
      const { modelName, filter } = args;

      let model;
      try {
        model = db.model(modelName);
      } catch (e) {
        return { isValidFilter: false, errors: `Invalid modelName specified, '${modelName}' does not exist.` };
      }

      const { mongoQuery, dxQuery } = filter;
      if (!mongoQuery && !dxQuery) {
        return { isValidFilter: false, errors: `Invalid filter, either 'mongoQuery' or 'dxQuery' must be specified.` };
      }
      if (mongoQuery && dxQuery) {
        return { isValidFilter: false, errors: `Invalid filter, specify one filter either 'mongoQuery' or 'dxQuery'.` };
      }

      let conditions;
      try {
        if (mongoQuery) {
          conditions = JSON5.parse(mongoQuery, filterReviver);
        } else if (dxQuery) {
          const scheme = appLib.appModel.models[modelName];
          conditions = filterParser.parse(dxQuery, scheme).conditions;
        }
      } catch (e) {
        return { isValidFilter: false, errors: e.message };
      }

      try {
        const mongoParams = { conditions, limit: -1 };
        await dba.aggregateItems({ model, mongoParams });
        return { isValidFilter: true };
      } catch (e) {
        if (e.name === 'MongoError') {
          return { isValidFilter: false, errors: e.message };
        }
        handleGraphQlError(e, 'Error occurred during filter validation', log, appLib);
      }
    },
  });
}

function addValidateFilterResolver() {
  const resolver = getValidateFilterResolver();
  schemaComposer.Query.addFields({ validateFilter: resolver });
}

module.exports = {
  addValidateFilterResolver,
};
