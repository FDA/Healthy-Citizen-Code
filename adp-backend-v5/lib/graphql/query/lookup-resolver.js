const { schemaComposer } = require('graphql-compose');
const _ = require('lodash');
const log = require('log4js').getLogger('graphql/lookup-resolver');
const { composeWithPagination } = require('../pagination');
const LookupContext = require('../../request-context/graphql/LookupContext');
const { getLookupTypeName } = require('../type/lookup');
const { handleGraphQlError } = require('../util');
const { getOrCreateTypeByModel } = require('../type/model');
const { COMPOSER_TYPES } = require('../type/common');

const paginationLookupResolverName = 'paginationLookups';
const lookupResolverName = 'findLookups';
const lookupCountResolverName = 'countLookups';

const lookupFilterITC = schemaComposer.createInputTC({
  name: 'lookupFilter',
  fields: {
    q: { type: 'String' },
    dxQuery: { type: 'String' },
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
      dxQuery: { type: 'String' },
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
      const { appLib } = context;
      const { modelName } = paginationContext;
      try {
        const { controllerUtil } = appLib;
        const { lookups } = await controllerUtil.getSchemaLookups(paginationContext);
        return lookups;
      } catch (e) {
        handleGraphQlError({ e, message: `Unable to find requested elements`, log, appLib, modelName });
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
      const { appLib } = context;
      const { modelName } = paginationContext;
      try {
        const { controllerUtil } = appLib;
        paginationContext.action = 'view';
        return await controllerUtil.getElementsCount({ context: paginationContext });
      } catch (e) {
        handleGraphQlError({ e, message: `Unable to count requested elements`, log, appLib, modelName });
      }
    },
  });

  return { type, resolver: type.getResolver(lookupCountResolverName) };
}

function addLookupsQueries(models, appLookups, logger) {
  _.each(appLookups, (lookupSpec, lookupId) => {
    _.each(lookupSpec.table, (tableSpec, lookupTableName) => {
      const lookupTypeName = getLookupTypeName(lookupId, lookupTableName);
      let lookupObjectType;
      try {
        lookupObjectType = schemaComposer.getOTC(lookupTypeName);
      } catch (e) {
        // lookupTypeName may not be found because of showInGraphql = false
        // TODO: change format of appLookups to pass variables starting with 'show'.
        return;
      }

      const isFilteringLookup = !!tableSpec.where;
      let inputTypeForForm;
      if (isFilteringLookup) {
        // create type for 'form' field sent by client
        const { sourceTable } = tableSpec;
        inputTypeForForm = getOrCreateTypeByModel(models[sourceTable], sourceTable, COMPOSER_TYPES.INPUT);
      }

      logger.trace(`Adding lookup Query for ${lookupTypeName}`);
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
