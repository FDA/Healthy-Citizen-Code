const { schemaComposer } = require('graphql-compose');
const log = require('log4js').getLogger('graphql/dev-extreme-filter-resolver');
const { composeWithPagination } = require('../pagination');
const DevExtremeContext = require('../../request-context/graphql/DevExtremeContext');
const { createTypeByModel, getOrCreateTypeByModel } = require('../type/model');
const { COMPOSER_TYPES } = require('../type/common');
const { ValidationError } = require('../../errors');

const paginationFindByDevExtremeFilterResolverName = 'paginationDx';
const findByDevExtremeFilterResolverName = 'findManyDx';
const countByDevExtremeFilterResolverName = 'countDx';

const dxQueryInput = schemaComposer.createInputTC({
  name: 'dxQueryInput',
  fields: {
    dxQuery: { type: 'String!' },
  },
});

const dxQueryInputRequired = dxQueryInput.getTypeNonNull();

function addFindManyByDevExtremeFilterResolver(type) {
  type.addResolver({
    kind: 'query',
    name: findByDevExtremeFilterResolverName,
    args: {
      filter: dxQueryInputRequired,
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
      try {
        const {
          controllerUtil,
          butil: { getRequestMeta },
        } = context.appLib;

        const { items, meta } = await controllerUtil.getItems(paginationContext, true);
        log.debug(`Meta: ${getRequestMeta(paginationContext, meta)}`);
        return items;
      } catch (e) {
        if (e instanceof ValidationError) {
          log.info(e.stack);
          throw e;
        }
        log.error(e.stack);
        throw new Error(`Unable to find requested elements`);
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
      filter: dxQueryInputRequired,
    },
    type: 'Int!',
    resolve: async ({ context, paginationContext }) => {
      try {
        const { getElementsCount } = context.appLib.controllerUtil;
        paginationContext.action = 'view';
        return getElementsCount({ context: paginationContext });
      } catch (e) {
        log.error(e.stack);
        throw new Error(`Unable to count requested elements`);
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
  dxQueryInput,
};
