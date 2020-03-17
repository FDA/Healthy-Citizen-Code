const log = require('log4js').getLogger('graphql/dev-extreme-filter-resolver');
const { composeWithPagination } = require('../pagination');
const DevExtremeContext = require('../../request-context/graphql/DevExtremeContext');
const { createTypeByModel, getOrCreateTypeByModel } = require('../type/model');
const { COMPOSER_TYPES, dxQueryWithQuickFilterInput } = require('../type/common');
const { handleGraphQlError } = require('../util');

const paginationFindByDevExtremeFilterResolverName = 'paginationDx';
const findByDevExtremeFilterResolverName = 'findManyDx';
const countByDevExtremeFilterResolverName = 'countDx';

function addFindManyByDevExtremeFilterResolver(type) {
  type.addResolver({
    kind: 'query',
    name: findByDevExtremeFilterResolverName,
    args: {
      filter: dxQueryWithQuickFilterInput,
      perPage: {
        type: 'Int',
      },
      page: {
        type: 'Int',
        defaultValue: 0,
      },
      sort: {
        type: 'String',
        defaultValue: '{_id: 1}',
      },
    },
    type: [type],
    resolve: async ({ context, paginationContext }) => {
      const { appLib } = context;
      try {
        const {
          controllerUtil,
          butil: { getRequestMeta },
        } = appLib;

        const { items, meta } = await controllerUtil.getItems(paginationContext, true);
        log.debug(`Meta: ${getRequestMeta(paginationContext, meta)}`);
        return items;
      } catch (e) {
        handleGraphQlError(e, `Unable to find requested elements`, log, appLib);
      }
    },
  });

  return { type, resolver: type.getResolver(findByDevExtremeFilterResolverName) };
}

function addCountByDevExtremeFilterResolver(type) {
  type.addResolver({
    kind: 'query',
    name: countByDevExtremeFilterResolverName,
    args: {
      filter: dxQueryWithQuickFilterInput,
    },
    type: 'Int!',
    resolve: async ({ context, paginationContext }) => {
      const { appLib } = context;
      try {
        const { getElementsCount } = appLib.controllerUtil;
        paginationContext.action = 'view';
        return getElementsCount({ context: paginationContext });
      } catch (e) {
        handleGraphQlError(e, `Unable to count requested elements`, log, appLib);
      }
    },
  });

  return { type, resolver: type.getResolver(countByDevExtremeFilterResolverName) };
}

function addFindByDevExtremeFilterResolver(model, modelName, isOverride) {
  const typeWithActions = isOverride
    ? createTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT_WITH_ACTIONS)
    : getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT_WITH_ACTIONS);
  addFindManyByDevExtremeFilterResolver(typeWithActions);
  addCountByDevExtremeFilterResolver(typeWithActions);

  composeWithPagination(typeWithActions, {
    paginationResolverName: paginationFindByDevExtremeFilterResolverName,
    findResolverName: findByDevExtremeFilterResolverName,
    countResolverName: countByDevExtremeFilterResolverName,
    getPaginationContext: async ({ args, context }) => {
      const { req, appLib } = context;
      return new DevExtremeContext(appLib, req, modelName, args).init();
    },
  });
  return { type: typeWithActions, resolver: typeWithActions.getResolver(paginationFindByDevExtremeFilterResolverName) };
}

module.exports = {
  addFindByDevExtremeFilterResolver,
  paginationFindByDevExtremeFilterResolverName,
  findByDevExtremeFilterResolverName,
  countByDevExtremeFilterResolverName,
};
