const { schemaComposer } = require('graphql-compose');
const log = require('log4js').getLogger('graphql/mongo-query-resolver');
const { composeWithPagination } = require('../pagination');
const MongoQueryContext = require('../../request-context/graphql/MongoQueryContext');
const { getOrCreateTypeByModel } = require('../type/model');
const { COMPOSER_TYPES } = require('../type/common');

const paginationFindByMongoQueryResolverName = 'paginationByMongoQuery';
const findByMongoQueryResolverName = 'findManyMongoQuery';
const countByMongoQueryResolverName = 'countMongoQuery';

const mongoQueryInput = schemaComposer.createInputTC({
  name: 'mongoQueryInput',
  fields: {
    mongoQuery: { type: 'String' },
  },
});

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
        log.error(e.stack);
        throw new Error(`Unable to get requested elements`);
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
