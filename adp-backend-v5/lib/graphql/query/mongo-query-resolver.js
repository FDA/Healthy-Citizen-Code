const log = require('log4js').getLogger('graphql/mongo-query-resolver');
const { composeWithPagination } = require('../pagination');
const MongoQueryContext = require('../../request-context/graphql/MongoQueryContext');
const { getOrCreateTypeByModel } = require('../type/model');
const { handleGraphQlError } = require('../util');
const { COMPOSER_TYPES, mongoQueryInput } = require('../type/common');

const paginationFindByMongoQueryResolverName = 'paginationByMongoQuery';
const findByMongoQueryResolverName = 'findManyMongoQuery';
const countByMongoQueryResolverName = 'countMongoQuery';

function addFindManyMongoQueryResolver(type) {
  type.addResolver({
    kind: 'query',
    name: findByMongoQueryResolverName,
    args: {
      filter: mongoQueryInput,
      perPage: {
        type: 'Int',
      },
      page: {
        type: 'Int',
        defaultValue: 0,
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
        const {
          controllerUtil,
          butil: { getRequestMeta },
        } = appLib;

        const { items, meta } = await controllerUtil.getItems(paginationContext, true);
        log.debug(`Meta: ${getRequestMeta(paginationContext, meta)}`);
        return items;
      } catch (e) {
        handleGraphQlError({ e, message: `Unable to get requested elements`, log, appLib, modelName });
      }
    },
  });

  return { type, resolver: type.getResolver(findByMongoQueryResolverName) };
}

function addCountMongoQueryResolver(type) {
  type.addResolver({
    kind: 'query',
    name: countByMongoQueryResolverName,
    args: {
      filter: mongoQueryInput,
    },
    type: 'Int!',
    resolve: async ({ context, paginationContext }) => {
      const { appLib } = context;
      const { modelName } = paginationContext;
      try {
        const { controllerUtil } = appLib;
        paginationContext.action = 'view';
        return controllerUtil.getElementsCount({ context: paginationContext });
      } catch (e) {
        handleGraphQlError({ e, message: `Unable to count requested elements`, log, appLib, modelName });
      }
    },
  });

  return { type, resolver: type.getResolver(countByMongoQueryResolverName) };
}

function addFindByMongoQueryResolver(model, modelName) {
  const typeWithActions = getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT_WITH_ACTIONS);
  addFindManyMongoQueryResolver(typeWithActions);
  addCountMongoQueryResolver(typeWithActions);

  const paginationType = composeWithPagination(typeWithActions, {
    paginationResolverName: paginationFindByMongoQueryResolverName,
    findResolverName: findByMongoQueryResolverName,
    countResolverName: countByMongoQueryResolverName,
    getPaginationContext: async ({ args, context }) => {
      const { req, appLib } = context;
      return new MongoQueryContext(appLib, req, modelName, args).init();
    },
  });
  return { type: paginationType, resolver: paginationType.getResolver(paginationFindByMongoQueryResolverName) };
}

module.exports = {
  addFindByMongoQueryResolver,
  paginationFindByMongoQueryResolverName,
  findByMongoQueryResolverName,
  countByMongoQueryResolverName,
};
