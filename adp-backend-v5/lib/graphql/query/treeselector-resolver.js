const { schemaComposer } = require('graphql-compose');
const _ = require('lodash');
const log = require('log4js').getLogger('graphql/treeselector-resolver');
const { composeWithPagination } = require('../pagination');
const TreeSelectorContext = require('../../request-context/graphql/TreeSelectorContext');
const { getTreeselectorTypeName } = require('../type/lookup');
const { getOrCreateTypeByModel } = require('../type/model');
const { MongoIdScalarTC, COMPOSER_TYPES } = require('../type/common');
const { ValidationError, AccessError, LinkedRecordError } = require('../../errors');

const paginationTreeselectorResolverName = 'paginationTreeselectors';
const treeselectorResolverName = 'findTreeselectors';
const treeselectorCountResolverName = 'countTreeselectors';

const treeselectorFilterITC = schemaComposer.createInputTC({
  name: 'treeselectorFilter',
  fields: {
    q: { type: 'String' },
    foreignKeyVal: { type: MongoIdScalarTC },
  },
});

function getTreeselectorFilter(treeselectorTableName, inputTypeForForm) {
  if (!inputTypeForForm) {
    return treeselectorFilterITC;
  }

  return schemaComposer.createInputTC({
    name: `treeSelectorFilter_${treeselectorTableName}`,
    fields: {
      q: { type: 'String' },
      foreignKeyVal: { type: MongoIdScalarTC },
      form: { type: inputTypeForForm },
    },
  });
}

function addTreeselectorPaginationResolver(treeselectorObjectType, inputTypeForForm, tableSpec, treeSelectorTableName) {
  const treeselectorFilter = getTreeselectorFilter(treeSelectorTableName, inputTypeForForm);
  addFindTreeselectorResolver(treeselectorObjectType, treeselectorFilter);
  addCountTreeselectorResolver(treeselectorObjectType, treeselectorFilter);

  const paginationType = composeWithPagination(treeselectorObjectType, {
    paginationResolverName: paginationTreeselectorResolverName,
    findResolverName: treeselectorResolverName,
    countResolverName: treeselectorCountResolverName,
    getPaginationContext: async ({ args, context }) => {
      const { req, appLib } = context;
      return new TreeSelectorContext(appLib, req, tableSpec, treeSelectorTableName, args).init();
    },
  });

  return { type: paginationType, resolver: paginationType.getResolver(paginationTreeselectorResolverName) };
}

function addFindTreeselectorResolver(type, treeselectorFilter) {
  type.addResolver({
    kind: 'query',
    name: treeselectorResolverName,
    args: {
      filter: treeselectorFilter,
      perPage: {
        type: 'Int',
      },
      page: {
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
        const { treeSelectors } = await controllerUtil.getTreeSelectorLookups(paginationContext);
        return treeSelectors;
      } catch (e) {
        log.error(e.stack);
        if (e instanceof ValidationError || e instanceof AccessError || e instanceof LinkedRecordError) {
          throw e;
        }
        throw new Error(`Unable to find requested elements`);
      }
    },
  });
}

function addCountTreeselectorResolver(type, treeselectorFilter) {
  type.addResolver({
    kind: 'query',
    name: treeselectorCountResolverName,
    args: {
      filter: treeselectorFilter,
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
}

function addTreeselectorsQueries(models, appTreeselectors, logger) {
  _.each(appTreeselectors, (treeselectorSpec, treeSelectorId) => {
    const treeSelectorTables = _.omit(treeselectorSpec, ['id']);
    _.each(treeSelectorTables, (tableSpec, treeselectorTableName) => {
      const treeselectorTypeName = getTreeselectorTypeName(treeSelectorId, treeselectorTableName);
      const treeselectorObjectType = schemaComposer.getOTC(treeselectorTypeName);

      const isFilteringLookup = !!tableSpec.where;
      let inputTypeForForm;
      if (isFilteringLookup) {
        // create type for 'form' field sent by client
        const { sourceTable } = tableSpec;
        inputTypeForForm = getOrCreateTypeByModel(models[sourceTable], sourceTable, COMPOSER_TYPES.INPUT);
      }

      logger.debug(`Adding treeselector Query for ${treeselectorTypeName}`);
      addTreeselectorPaginationResolver(treeselectorObjectType, inputTypeForForm, tableSpec, treeselectorTableName);

      schemaComposer.Query.addFields({
        [treeselectorTypeName]: treeselectorObjectType.getResolver(paginationTreeselectorResolverName),
      });
    });
  });
}

module.exports = {
  addTreeselectorsQueries,
  treeselectorResolverName,
  treeselectorCountResolverName,
  paginationTreeselectorResolverName,
};
