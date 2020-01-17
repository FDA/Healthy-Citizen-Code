const { schemaComposer } = require('graphql-compose');
const _ = require('lodash');
const log = require('log4js').getLogger('graphql/lookup-resolver');
const { composeWithPagination } = require('../pagination');
const LookupContext = require('../../request-context/graphql/LookupContext');
const { getLookupTypeName } = require('../type/lookup');
const { ValidationError, AccessError, LinkedRecordError } = require('../../errors');
const { getOrCreateTypeByModel } = require('../type/model');
const { COMPOSER_TYPES } = require('../type/common');

const paginationLookupResolverName = 'paginationLookups';
const lookupResolverName = 'findLookups';
const lookupCountResolverName = 'countLookups';

const lookupFilterITC = schemaComposer.createInputTC({
  name: 'lookupFilter',
  fields: {
    q: { type: 'String' },
  },
});

function getLookupFilter(lookupId, inputTypeForForm) {
  if (!inputTypeForForm) {
    return lookupFilterITC;
  }

  return schemaComposer.createInputTC({
    name: `lookupFilter_${lookupId}`,
    fields: {
      q: { type: 'String' },
      form: { type: inputTypeForForm },
    },
  });
}

function addLookupPaginationResolver({ lookupObjectType, inputTypeForForm, tableSpec, lookupTableName, lookupId }) {
  const lookupFilter = getLookupFilter(lookupId, inputTypeForForm);
  addFindLookupResolver(lookupObjectType, lookupFilter);
  addCountLookupResolver(lookupObjectType, lookupFilter);

  composeWithPagination(lookupObjectType, {
    paginationResolverName: paginationLookupResolverName,
    findResolverName: lookupResolverName,
    countResolverName: lookupCountResolverName,
    getPaginationContext: async ({ args, context }) => {
      const { req, appLib } = context;
      return new LookupContext(appLib, req, tableSpec, lookupTableName, args).init();
    },
  });
  return { type: lookupObjectType, resolver: lookupObjectType.getResolver(paginationLookupResolverName) };
}

function addFindLookupResolver(type, lookupFilter) {
  type.addResolver({
    kind: 'query',
    name: lookupResolverName,
    args: {
      filter: lookupFilter,
      perPage: {
        type: 'Int',
      },
      skip: {
        type: 'Int',
      },
      sort: {
        type: 'String',
      },
    },
    type: [type],
    resolve: async ({ context, paginationContext }) => {
      try {
        const { controllerUtil } = context.appLib;
        const { lookups } = await controllerUtil.getSchemaLookups(paginationContext);
        return lookups;
      } catch (e) {
        log.error(e.stack);
        if (e instanceof ValidationError || e instanceof AccessError || e instanceof LinkedRecordError) {
          throw e;
        }
        throw new Error(`Unable to find requested elements`);
      }
    },
  });

  return { type, resolver: type.getResolver(lookupResolverName) };
}

function addCountLookupResolver(type, lookupFilter) {
  type.addResolver({
    kind: 'query',
    name: lookupCountResolverName,
    args: {
      filter: lookupFilter,
    },
    type: 'Int!',
    resolve: async ({ context, paginationContext }) => {
      try {
        const { controllerUtil } = context.appLib;
        paginationContext.action = 'view';
        return controllerUtil.getElementsCount({ context: paginationContext });
      } catch (e) {
        log.error(e.stack);
        throw new Error(`Unable to count requested elements`);
      }
    },
  });

  return { type, resolver: type.getResolver(lookupCountResolverName) };
}

function addLookupsQueries(models, appLookups, logger) {
  _.each(appLookups, (lookupSpec, lookupId) => {
    _.each(lookupSpec.table, (tableSpec, lookupTableName) => {
      const lookupTypeName = getLookupTypeName(lookupId, lookupTableName);
      const lookupObjectType = schemaComposer.getOTC(lookupTypeName);

      const isFilteringLookup = !!tableSpec.where;
      let inputTypeForForm;
      if (isFilteringLookup) {
        // create type for 'form' field sent by client
        const { sourceTable } = tableSpec;
        inputTypeForForm = getOrCreateTypeByModel(models[sourceTable], sourceTable, COMPOSER_TYPES.INPUT);
      }

      logger.debug(`Adding lookup Query for ${lookupTypeName}`);
      addLookupPaginationResolver({ lookupObjectType, inputTypeForForm, tableSpec, lookupTableName, lookupId });
      schemaComposer.Query.addFields({
        [lookupTypeName]: lookupObjectType.getResolver(paginationLookupResolverName),
      });
    });
  });
}
module.exports = {
  addLookupsQueries,
  lookupResolverName,
  lookupCountResolverName,
  paginationLookupResolverName,
};
