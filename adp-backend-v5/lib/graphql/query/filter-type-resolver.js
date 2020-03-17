const log = require('log4js').getLogger('graphql/filter-type-resolver');
const { composeWithPagination } = require('../pagination');
const FilterContext = require('../../request-context/graphql/FilterContext');
const { getOrCreateTypeByModel } = require('../type/model');
const { COMPOSER_TYPES } = require('../type/common');
const { handleGraphQlError } = require('../util');

const paginationFindByFilterTypeResolverName = 'paginationByFilterType';
const findByFilterTypeResolverName = 'findMany';
const countByFilterTypeResolverName = 'count';

function addFindManyByFilterTypeResolver(type, filterType) {
  type.addResolver({
    kind: 'query',
    name: findByFilterTypeResolverName,
    args: {
      filter: filterType,
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
        handleGraphQlError(e, `Unable to get requested elements`, log, appLib);
      }
    },
  });

  return { type, resolver: type.getResolver(findByFilterTypeResolverName) };
}

function addCountByFilterTypeResolver(type, filterType) {
  type.addResolver({
    kind: 'query',
    name: countByFilterTypeResolverName,
    args: {
      filter: filterType,
    },
    type: 'Int!',
    resolve: async ({ context, paginationContext }) => {
      const { appLib } = context;
      try {
        const { controllerUtil } = appLib;
        paginationContext.action = 'view';
        return controllerUtil.getElementsCount({ context: paginationContext });
      } catch (e) {
        handleGraphQlError(e, `Unable to count requested elements`, log, appLib);
      }
    },
  });

  return { type, resolver: type.getResolver(countByFilterTypeResolverName) };
}

function addFindByFilterTypeResolver(model, modelName, filterType) {
  const typeWithActions = getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT_WITH_ACTIONS);
  addFindManyByFilterTypeResolver(typeWithActions, filterType);
  addCountByFilterTypeResolver(typeWithActions, filterType);

  composeWithPagination(typeWithActions, {
    paginationResolverName: paginationFindByFilterTypeResolverName,
    findResolverName: findByFilterTypeResolverName,
    countResolverName: countByFilterTypeResolverName,
    getPaginationContext: async ({ args, context }) => {
      const { req, appLib } = context;
      return new FilterContext(appLib, req, modelName, args).init();
    },
  });
  return { type: typeWithActions, resolver: typeWithActions.getResolver(paginationFindByFilterTypeResolverName) };
}

module.exports = {
  addFindByFilterTypeResolver,
  paginationFindByFilterTypeResolverName,
  findByFilterTypeResolverName,
  countByFilterTypeResolverName,
};
