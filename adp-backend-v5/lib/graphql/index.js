const _ = require('lodash');
const { TypeComposer, schemaComposer } = require('graphql-compose');
const { addPaginationResolver } = require('./query/pagination-mongo-resolver');
const {
  addCreateOneResolver,
  addUpsertOneResolver,
  addUpdateOneResolver,
  addDeleteOneResolver,
  addDeleteManyResolver,
} = require('./mutation');

const { generateTypeByModel } = require('./type');

module.exports = appLib => {
  function getDb(modelName) {
    return appLib.db.model(modelName);
  }

  const m = {};

  m.schemaComposer = schemaComposer;
  m.TypeComposer = TypeComposer;

  m.addQuery = (queryName, resolver) => {
    schemaComposer.Query.addFields({
      [queryName]: resolver,
    });
  };

  m.addMutation = (mutationName, resolver) => {
    schemaComposer.Mutation.addFields({
      [mutationName]: resolver,
    });
  };

  m.addDefaultTypesAndResolversForModel = modelName => {
    if (schemaComposer.has(modelName)) {
      return;
    }

    const model = appLib.appModel.models[modelName];
    const db = getDb(modelName);
    if (!db || !model) {
      throw new Error(`Model ${modelName} not found`);
    }
    appLib.log.debug('Adding graphql type and default resolvers for model', modelName);
    generateTypeByModel(model, modelName);

    addPaginationResolver(modelName, db);

    addCreateOneResolver(modelName, db);
    addUpsertOneResolver(modelName, db);
    addUpdateOneResolver(modelName, db);
    addDeleteOneResolver(modelName, db);
    addDeleteManyResolver(modelName, db);
  };

  m.addDefaultMutations = modelNames => {
    _.forEach(modelNames, modelName => {
      m.addDefaultTypesAndResolversForModel(modelName);
      const type = schemaComposer.getTC(modelName);
      schemaComposer.Mutation.addFields({
        [`${modelName}UpsertOne`]: type.getResolver('upsertOne'),
        [`${modelName}UpdateOne`]: type.getResolver('updateOne'),
        [`${modelName}DeleteMany`]: type.getResolver('deleteMany'),
        [`${modelName}DeleteOne`]: type.getResolver('deleteOne'),
        [`${modelName}Create`]: type.getResolver('createOne'),
      });
    });
  };

  m.addDefaultQuery = modelNames => {
    _.forEach(modelNames, modelName => {
      const type = schemaComposer.getTC(modelName);
      schemaComposer.Query.addFields({
        [modelName]: type.getResolver('pagination'),
      });
    });
  };

  return m;
};
