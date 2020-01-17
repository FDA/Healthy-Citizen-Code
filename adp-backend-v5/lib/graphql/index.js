const _ = require('lodash');
const {
  addFindByMongoQueryResolver,
  paginationFindByMongoQueryResolverName,
  findByMongoQueryResolverName,
  countByMongoQueryResolverName,
} = require('./query/mongo-query-resolver');
const {
  addFindByDevExtremeFilterResolver,
  paginationFindByDevExtremeFilterResolverName,
  findByDevExtremeFilterResolverName,
  countByDevExtremeFilterResolverName,
} = require('./query/dev-extreme-filter-resolver');
const {
  addFindByFilterTypeResolver,
  paginationFindByFilterTypeResolverName,
  findByFilterTypeResolverName,
  countByFilterTypeResolverName,
} = require('./query/filter-type-resolver');
const {
  addLookupsQueries,
  lookupResolverName,
  lookupCountResolverName,
  paginationLookupResolverName,
} = require('./query/lookup-resolver');
const {
  addTreeselectorsQueries,
  treeselectorResolverName,
  treeselectorCountResolverName,
  paginationTreeselectorResolverName,
} = require('./query/treeselector-resolver');
const { addDevExtremeGroupResolver, devExtremeGroupResolverName } = require('./query/dev-extreme-group-resolver');
const { getOrCreateTypeByModel } = require('./type/model');

const {
  addCreateOneResolver,
  addUpdateOneResolver,
  addDeleteOneResolver,
  addUpsertOneResolver,
  createOneResolverName,
  deleteOneResolverName,
  updateOneResolverName,
  upsertOneResolverName,
} = require('./mutation');

module.exports = appLib => {
  const m = {};
  m.graphqlCompose = require('graphql-compose');
  const { schemaComposer } = m.graphqlCompose;

  m.getDb = modelName => appLib.db.model(modelName);

  m.getModel = modelName => appLib.appModel.models[modelName];

  m.addQuery = (queryName, resolver) => {
    schemaComposer.Query.addFields({ [queryName]: resolver });
  };

  m.removeQueries = queryName => {
    schemaComposer.Query.removeField(queryName);
  };

  m.addMutation = (mutationName, resolver) => {
    schemaComposer.Mutation.addFields({ [mutationName]: resolver });
  };

  m.removeMutations = mutationNames => {
    schemaComposer.Mutation.removeField(mutationNames);
  };

  m.resolvers = {
    addFindManyByMongoQuery(modelName) {
      return addFindByMongoQueryResolver(m.getModel(modelName), modelName);
    },
    addFindManyByFilterType(modelName, filterType) {
      return addFindByFilterTypeResolver(m.getModel(modelName), modelName, filterType);
    },
    addCreateOne(modelName) {
      return addCreateOneResolver(m.getModel(modelName), modelName);
    },
    addUpdateOne(modelName) {
      return addUpdateOneResolver(m.getModel(modelName), modelName);
    },
    addDeleteOne(modelName) {
      return addDeleteOneResolver(m.getModel(modelName), modelName);
    },
    addFindByDevExtremeFilter(modelName) {
      return addFindByDevExtremeFilterResolver(m.getModel(modelName), modelName);
    },
    addDevExtremeGroupResolver(modelName) {
      return addDevExtremeGroupResolver(m.getModel(modelName), modelName);
    },
    addUpsertOne(modelName, filterType) {
      return addUpsertOneResolver(m.getModel(modelName), modelName, filterType);
    },
  };
  m.resolversNames = {
    // dx filter resolvers
    paginationFindByDevExtremeFilterResolverName,
    findByDevExtremeFilterResolverName,
    countByDevExtremeFilterResolverName,
    // mongo query resolvers
    paginationFindByMongoQueryResolverName,
    findByMongoQueryResolverName,
    countByMongoQueryResolverName,
    // simple filter resolvers
    paginationFindByFilterTypeResolverName,
    findByFilterTypeResolverName,
    countByFilterTypeResolverName,
    // lookup resolvers
    lookupResolverName,
    lookupCountResolverName,
    paginationLookupResolverName,
    // treeselector resolvers
    treeselectorResolverName,
    treeselectorCountResolverName,
    paginationTreeselectorResolverName,
    // group resolver
    devExtremeGroupResolverName,
    // mutation resolvers
    createOneResolverName,
    deleteOneResolverName,
    updateOneResolverName,
    upsertOneResolverName,
  };

  m.getOrCreateTypeByModel = (modelName, composerType) => {
    return getOrCreateTypeByModel(m.getModel(modelName), modelName, composerType);
  };
  m.COMPOSER_TYPES = require('./type/common').COMPOSER_TYPES;

  m.queryPostfix = {
    dxQueryPostfix: `Dx`,
    dxGroupPostfix: `DxGroup`,
    modelPostfix: ``,
  };

  m.mutationPostfix = {
    updatePostfix: `UpdateOne`,
    deletePostfix: `DeleteOne`,
    createPostfix: `Create`,
  };

  m.addDefaultMutations = modelNames => {
    const { updatePostfix, deletePostfix, createPostfix } = m.mutationPostfix;

    _.each(_.castArray(modelNames), modelName => {
      const { addCreateOne, addUpdateOne, addDeleteOne } = m.resolvers;
      const { resolver: createOneResolver } = addCreateOne(modelName);
      const { resolver: updateOneResolver } = addUpdateOne(modelName);
      const { resolver: deleteOneResolver } = addDeleteOne(modelName);

      schemaComposer.Mutation.addFields({
        [`${modelName}${updatePostfix}`]: updateOneResolver,
        [`${modelName}${deletePostfix}`]: deleteOneResolver,
        [`${modelName}${createPostfix}`]: createOneResolver,
        // [`${modelName}UpsertOne`]: type.getResolver('upsertOne'),
      });
    });
  };

  m.removeDefaultMutations = modelNames => {
    const { updatePostfix, deletePostfix, createPostfix } = m.mutationPostfix;
    _.each(_.castArray(modelNames), modelName => {
      schemaComposer.Mutation.removeField([
        `${modelName}${updatePostfix}`,
        `${modelName}${deletePostfix}`,
        `${modelName}${createPostfix}`,
      ]);
    });
  };

  m.addDefaultQueries = modelNames => {
    const { dxGroupPostfix, dxQueryPostfix, modelPostfix } = m.queryPostfix;

    _.each(_.castArray(modelNames), modelName => {
      const { resolver: mongoQueryResolver } = m.resolvers.addFindManyByMongoQuery(modelName);
      schemaComposer.Query.addFields({ [`${modelName}${modelPostfix}`]: mongoQueryResolver });

      const { resolver: dxQueryResolver } = m.resolvers.addFindByDevExtremeFilter(modelName);
      schemaComposer.Query.addFields({ [`${modelName}${dxQueryPostfix}`]: dxQueryResolver });

      const { resolver: dxGroupResolver } = m.resolvers.addDevExtremeGroupResolver(modelName);
      schemaComposer.Query.addFields({ [`${modelName}${dxGroupPostfix}`]: dxGroupResolver });
    });
  };

  /**
   * Methods getMutationResolver, getQueryResolver exists only because there is no way (at least I couldn't find it) to get resolver by query/mutation name
   * - schemaComposer.Mutation.get(name) returns type, not resolver. This type may contain multiple resolvers.
   * - schemaComposer.Mutation.getField(name) returns field. This field is of object type and contains resolve function, not resolver.
   * Maybe there is a way to get resolver by resolve function but it seems like a crutch
   */
  m.getMutationResolver = mutationName => {
    const mutationField = schemaComposer.Mutation.get(mutationName);
    if (!mutationField) {
      return null;
    }

    const { updatePostfix, deletePostfix, createPostfix } = m.mutationPostfix;
    if (mutationName.endsWith(updatePostfix)) {
      return mutationField.getResolver(updateOneResolverName);
    }
    if (mutationName.endsWith(deletePostfix)) {
      return mutationField.getResolver(deleteOneResolverName);
    }
    if (mutationName.endsWith(createPostfix)) {
      return mutationField.getResolver(createOneResolverName);
    }
    return null;
  };

  m.wrapMutation = (mutationName, wrapper) => {
    try {
      const mutationResolver = m.getMutationResolver(mutationName);
      m.addMutation(mutationName, mutationResolver.wrapResolve(wrapper));
    } catch (e) {
      throw new Error(`Unable to wrap mutation ${e}`);
    }
  };

  m.getQueryResolver = queryName => {
    const mutationField = schemaComposer.Query.get(queryName);
    if (!mutationField) {
      return null;
    }

    const { dxGroupPostfix, dxQueryPostfix, modelPostfix } = m.queryPostfix;
    if (queryName.endsWith(dxGroupPostfix)) {
      return mutationField.getResolver(devExtremeGroupResolverName);
    }
    if (queryName.endsWith(dxQueryPostfix)) {
      return mutationField.getResolver(paginationFindByDevExtremeFilterResolverName);
    }
    if (queryName.endsWith(modelPostfix)) {
      return mutationField.getResolver(paginationFindByMongoQueryResolverName);
    }
    return null;
  };

  m.wrapQuery = (queryName, wrapper) => {
    try {
      const queryResolver = m.getQueryResolver(queryName);
      m.addQuery(queryName, queryResolver.wrapResolve(wrapper));
    } catch (e) {
      throw new Error(`Unable to wrap query ${e}`);
    }
  };

  m.removeDefaultQueries = modelNames => {
    _.each(_.castArray(modelNames), modelName => {
      schemaComposer.Query.removeField(modelName);
    });
  };

  m.addAll = () => {
    const { models } = appLib.appModel;
    const { appLookups, log, appTreeSelectors } = appLib;
    const modelNames = _.keys(models);
    m.addDefaultQueries(modelNames);
    m.addDefaultMutations(modelNames);
    addLookupsQueries(models, appLookups, log);
    addTreeselectorsQueries(models, appTreeSelectors, log);
  };

  return m;
};
