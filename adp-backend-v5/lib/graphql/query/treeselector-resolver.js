const { schemaComposer } = require('graphql-compose');
const _ = require('lodash');
const log = require('log4js').getLogger('graphql/treeselector-resolver');
const { composeWithPagination } = require('../pagination');
const TreeSelectorContext = require('../../request-context/graphql/TreeSelectorContext');
const { getTreeselectorTypeName } = require('../type/lookup');
const { getOrCreateTypeByModel } = require('../type/model');
const { MongoIdScalarTC, COMPOSER_TYPES } = require('../type/common');
const { handleGraphQlError } = require('../util');

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
      const { appLib } = context;
      const { modelName } = paginationContext;
      try {
        const { controllerUtil } = appLib;
        const { treeSelectors } = await controllerUtil.getTreeSelectorLookups(paginationContext);
        return treeSelectors;
      } catch (e) {
        handleGraphQlError({ e, message: `Unable to find requested elements`, log, appLib, modelName });
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
}

function addTreeselectorsQueries(models, appTreeselectors, logger) {
  _.each(appTreeselectors, (treeselectorSpec, treeSelectorId) => {
    const treeSelectorTables = _.omit(treeselectorSpec, ['id']);
    _.each(treeSelectorTables, (tableSpec, treeselectorTableName) => {
      const treeselectorTypeName = getTreeselectorTypeName(treeSelectorId, treeselectorTableName);
      let treeselectorObjectType;
      try {
        treeselectorObjectType = schemaComposer.getOTC(treeselectorTypeName);
      } catch (e) {
        // treeselectorObjectType may not be found because of showInGraphql = false
        // TODO: change format of appTreeselectors to pass variables starting with 'show'.
        return;
      }

      const isFilteringLookup = !!tableSpec.where;
      let inputTypeForForm;
      if (isFilteringLookup) {
        // create type for 'form' field sent by client
        const { sourceTable } = tableSpec;
        inputTypeForForm = getOrCreateTypeByModel(models[sourceTable], sourceTable, COMPOSER_TYPES.INPUT);
      }

      logger.trace(`Adding treeselector Query for ${treeselectorTypeName}`);
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
