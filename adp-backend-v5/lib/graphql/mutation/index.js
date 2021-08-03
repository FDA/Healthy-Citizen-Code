const { ObjectId } = require('mongodb');
const _ = require('lodash');
const log = require('log4js').getLogger('graphql/mutation');
const { MongoIdArrayITC, MongoIdITC, COMPOSER_TYPES } = require('../type/common');
const { getOrCreateTypeByModel } = require('../type/model');
const GraphQlContext = require('../../request-context/graphql/GraphQlContext');
const { handleGraphQlError } = require('../util');

const deleteOutputType = `type DeleteType {
  deletedCount: Int
}`;

const createOneResolverName = 'createOne';
const deleteOneResolverName = 'deleteOne';
const deleteManyResolverName = 'deleteMany';
const updateOneResolverName = 'updateOne';
const updateManyResolverName = 'updateMany';
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
      const { req, appLib } = context;
      try {
        const graphQlContext = await new GraphQlContext(appLib, req, modelName, args).init();
        return await appLib.dba.withTransaction((session) =>
          appLib.controllerUtil.postItem(graphQlContext, args.record, session)
        );
      } catch (e) {
        handleGraphQlError({ e, message: `Unable to create record`, log, appLib, modelName });
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
      const { req, appLib } = context;
      try {
        const graphQlContext = await new GraphQlContext(appLib, req, modelName, args).init();
        graphQlContext.mongoParams = getMongoParams(args);
        const deletedRecord = await appLib.dba.withTransaction((session) =>
          appLib.controllerUtil.deleteItem(graphQlContext, session)
        );
        // add deletedRecord to make it available in wrapMutation
        context.deletedRecord = deletedRecord;

        return { deletedCount: 1 };
      } catch (e) {
        handleGraphQlError({ e, message: `Unable to delete record`, log, appLib, modelName });
      }
    },
  });

  return { type, resolver: type.getResolver(deleteOneResolverName) };
}

function addDeleteManyResolver(model, modelName) {
  const type = getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT);
  type.addResolver({
    kind: 'mutation',
    name: deleteManyResolverName,
    args: {
      filter: MongoIdArrayITC.getTypeNonNull(),
    },
    type: deleteOutputType,
    resolve: async ({ args, context }) => {
      const { req, appLib } = context;
      try {
        const graphQlContext = await new GraphQlContext(appLib, req, modelName, args).init();
        graphQlContext.mongoParams = { conditions: { _id: { $in: args.filter._ids } } };
        const deletedCount = await appLib.dba.withTransaction((session) =>
          appLib.controllerUtil.deleteItems(graphQlContext, session)
        );

        return { deletedCount };
      } catch (e) {
        handleGraphQlError({ e, message: `Unable to delete records`, log, appLib, modelName });
      }
    },
  });

  return { type, resolver: type.getResolver(deleteManyResolverName) };
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
      const { req, appLib } = context;
      try {
        const graphQlContext = await new GraphQlContext(appLib, req, modelName, args).init();
        graphQlContext.mongoParams = getMongoParams(args);

        return await appLib.dba.withTransaction((session) =>
          appLib.controllerUtil.putItem(graphQlContext, args.record, session)
        );
      } catch (e) {
        handleGraphQlError({ e, message: `Unable to update record`, log, appLib, modelName });
      }
    },
  });

  return { type, resolver: type.getResolver(updateOneResolverName) };
}

function addUpdateManyResolver(model, modelName) {
  const type = getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.OUTPUT);
  type.addResolver({
    kind: 'mutation',
    name: updateManyResolverName,
    args: {
      records: getOrCreateTypeByModel(model, modelName, COMPOSER_TYPES.INPUT_UPDATE_MANY),
    },
    type: `type UpdateManyErrors { errors: JSON }`,
    resolve: async ({ args, context }) => {
      const { req, appLib } = context;
      try {
        const graphQlContext = await new GraphQlContext(appLib, req, modelName, args).init();
        graphQlContext.mongoParams = { _id: { $in: _.map(args.records, (r) => ObjectId(r._id)) } };
        const errors = await appLib.dba.withTransaction((session) =>
          appLib.controllerUtil.putItems(graphQlContext, args.records, session)
        );
        return { errors };
      } catch (e) {
        handleGraphQlError({ e, message: `Unable to update record`, log, appLib, modelName });
      }
    },
  });

  return { type, resolver: type.getResolver(updateManyResolverName) };
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
      const { req, appLib } = context;
      try {
        const graphQlContext = await new GraphQlContext(appLib, req, modelName, args).init();
        graphQlContext.mongoParams = getMongoParams(args);
        return await appLib.dba.withTransaction((session) =>
          appLib.controllerUtil.upsertItem(graphQlContext, args.record, session)
        );
      } catch (e) {
        handleGraphQlError({ e, message: `Unable to upsert record`, log, appLib, modelName });
      }
    },
  });

  return { type, resolver: type.getResolver(upsertOneResolverName) };
}

module.exports = {
  addCreateOneResolver,
  addUpdateOneResolver,
  addUpdateManyResolver,
  addDeleteOneResolver,
  addDeleteManyResolver,
  addUpsertOneResolver,
  createOneResolverName,
  deleteOneResolverName,
  deleteManyResolverName,
  updateOneResolverName,
  updateManyResolverName,
  upsertOneResolverName,
  deleteOutputType,
  getMongoParams,
};
