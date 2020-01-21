const log = require('log4js').getLogger('graphql/mutation');
const { MongoIdITC, COMPOSER_TYPES } = require('../type/common');
const { getOrCreateTypeByModel } = require('../type/model');
const GraphQlContext = require('../../request-context/graphql/GraphQlContext');
const { ValidationError, AccessError, LinkedRecordError } = require('../../errors');

const deleteOutputType = `type DeleteType {
      deletedCount: Int
    }`;

const createOneResolverName = 'createOne';
const deleteOneResolverName = 'deleteOne';
const updateOneResolverName = 'updateOne';
const upsertOneResolverName = 'upsertOne';

function addCreateOneResolver(model, modelName) {
  const type = getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT);
  type.addResolver({
    kind: 'mutation',
    name: createOneResolverName,
    args: {
      record: getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.INPUT_WITHOUT_ID),
    },
    type,
    resolve: async ({ args, context }) => {
      try {
        const { req, appLib } = context;
        const graphQlContext = await new GraphQlContext(appLib, req, modelName, args).init();
        // no filtering for create record
        graphQlContext.mongoParams = { conditions: {} };
        return appLib.dba.withTransaction(session =>
          appLib.controllerUtil.postItem(graphQlContext, args.record, session)
        );
      } catch (e) {
        log.error(e.stack);
        throw new Error(`Unable to create record`);
      }
    },
  });

  return { type, resolver: type.getResolver(createOneResolverName) };
}

/**
 * This function helps to avoid 'TypeError: obj.hasOwnProperty is not a function' thrown by mongoose
 * in node_modules/mongoose/lib/cast.js:32.
 * The reason why args.filter does not have 'hasOwnProperty' function is that it's created inside 'graphql' module
 * with Object.create(null). See more: https://stackoverflow.com/questions/47773538/typeerror-obj-hasownproperty-is-not-a-function-when-calling-graphql-mutation
 * When using '{ ...args.filter }' result object is generated with Object.prototype and therefore has 'hasOwnProperty' function
 * @param args
 * @returns {{conditions: {}}}
 */
function getMongoParams(args) {
  return { conditions: { ...args.filter } };
}

function addDeleteOneResolver(model, modelName) {
  const type = getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT);
  type.addResolver({
    kind: 'mutation',
    name: deleteOneResolverName,
    args: {
      filter: MongoIdITC.getTypeNonNull(),
    },
    type: deleteOutputType,
    resolve: async ({ args, context }) => {
      try {
        const { req, appLib } = context;
        const graphQlContext = await new GraphQlContext(appLib, req, modelName, args).init();
        graphQlContext.mongoParams = getMongoParams(args);
        await appLib.dba.withTransaction(session => appLib.controllerUtil.deleteItem(graphQlContext, session));
        return { deletedCount: 1 };
      } catch (e) {
        log.error(e.stack);
        if (e instanceof ValidationError || e instanceof AccessError || e instanceof LinkedRecordError) {
          throw e;
        }
        throw new Error(`Unable to delete record`);
      }
    },
  });

  return { type, resolver: type.getResolver(deleteOneResolverName) };
}

function addUpdateOneResolver(model, modelName) {
  const type = getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT);
  type.addResolver({
    kind: 'mutation',
    name: updateOneResolverName,
    args: {
      filter: MongoIdITC.getTypeNonNull(),
      record: getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.INPUT_WITHOUT_ID),
    },
    type,
    resolve: async ({ args, context }) => {
      try {
        const { req, appLib } = context;
        const graphQlContext = await new GraphQlContext(appLib, req, modelName, args).init();
        graphQlContext.mongoParams = getMongoParams(args);
        return appLib.dba.withTransaction(session =>
          appLib.controllerUtil.putItem(graphQlContext, args.record, session)
        );
      } catch (e) {
        log.error(e.stack);
        throw new Error(`Unable to update record`);
      }
    },
  });

  return { type, resolver: type.getResolver(updateOneResolverName) };
}

function addUpsertOneResolver(model, modelName, filterType) {
  const type = getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT);
  const inputTypeWithoutId = getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.INPUT_WITHOUT_ID);
  type.addResolver({
    kind: 'mutation',
    name: upsertOneResolverName,
    args: {
      record: inputTypeWithoutId,
      filter: filterType || inputTypeWithoutId,
    },
    type,
    resolve: async ({ args, context }) => {
      try {
        const { req, appLib } = context;
        const graphQlContext = await new GraphQlContext(appLib, req, modelName, args).init();
        graphQlContext.mongoParams = getMongoParams(args);
        return appLib.dba.withTransaction(session =>
          appLib.controllerUtil.upsertItem(graphQlContext, args.record, session)
        );
      } catch (e) {
        log.error(e.stack);
        throw new Error(`Unable to upsert record`);
      }
    },
  });

  return { type, resolver: type.getResolver(upsertOneResolverName) };
}

module.exports = {
  addCreateOneResolver,
  addUpdateOneResolver,
  addDeleteOneResolver,
  addUpsertOneResolver,
  createOneResolverName,
  deleteOneResolverName,
  updateOneResolverName,
  upsertOneResolverName,
  deleteOutputType,
  getMongoParams,
};
