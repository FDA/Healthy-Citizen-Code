const _ = require('lodash');
const log = require('log4js').getLogger('lib/graphql');

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

module.exports = (appLib, graphQlRoute = '/graphql', altairRoute = '/altair') => {
  const m = {};
  m.graphqlCompose = require('graphql-compose');
  const { schemaComposer } = m.graphqlCompose;

  m.connect = require(`./connect`)(appLib, graphQlRoute, altairRoute);

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
    addFindManyByMongoQuery({ model, modelName }) {
      return addFindByMongoQueryResolver(model || m.getModel(modelName), modelName);
    },
    addFindManyByFilterType({ model, modelName, filterType }) {
      return addFindByFilterTypeResolver(model || m.getModel(modelName), modelName, filterType);
    },
    addCreateOne({ model, modelName }) {
      return addCreateOneResolver(model || m.getModel(modelName), modelName);
    },
    addUpdateOne({ model, modelName }) {
      return addUpdateOneResolver(model || m.getModel(modelName), modelName);
    },
    addDeleteOne({ model, modelName }) {
      return addDeleteOneResolver(model || m.getModel(modelName), modelName);
    },
    addFindByDevExtremeFilter({ model, modelName }) {
      return addFindByDevExtremeFilterResolver(model || m.getModel(modelName), modelName);
    },
    addDevExtremeGroup({ model, modelName }) {
      return addDevExtremeGroupResolver(model || m.getModel(modelName), modelName);
    },
    addUpsertOne({ model, modelName, filterType }) {
      return addUpsertOneResolver(model || m.getModel(modelName), modelName, filterType);
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

  function getModelInfo(arg) {
    if (_.isString(arg)) {
      // simple model name
      return { [arg]: m.getModel(arg) };
    }
    if (_.isArray(arg)) {
      // array of model names
      return _.reduce(
        arg,
        (result, modelName) => {
          result[modelName] = m.getModel(modelName);
          return result;
        },
        {}
      );
    }
    if (_.isPlainObject(arg)) {
      // ready { [modelName]: model } object
      return arg;
    }
    throw new Error(`Invalid format for model argument.`);
  }

  m.addDefaultMutations = modelArg => {
    const { updatePostfix, deletePostfix, createPostfix } = m.mutationPostfix;
    const { addCreateOne, addUpdateOne, addDeleteOne } = m.resolvers;

    const modelInfo = getModelInfo(modelArg);
    _.each(modelInfo, (model, modelName) => {
      const updateMutationName = `${modelName}${updatePostfix}`;
      const createMutationName = `${modelName}${createPostfix}`;
      const deleteMutationName = `${modelName}${deletePostfix}`;

      log.trace(`Adding create mutation '${createMutationName}'`);
      schemaComposer.Mutation.addFields({ [createMutationName]: addCreateOne({ model, modelName }).resolver });

      log.trace(`Adding update mutation '${updateMutationName}'`);
      schemaComposer.Mutation.addFields({ [updateMutationName]: addUpdateOne({ model, modelName }).resolver });

      log.trace(`Adding delete mutation '${deleteMutationName}'`);
      schemaComposer.Mutation.addFields({ [deleteMutationName]: addDeleteOne({ model, modelName }).resolver });

      // [`${modelName}UpsertOne`]: type.getResolver('upsertOne'),
    });
  };

  m.removeDefaultMutations = modelNames => {
    const { updatePostfix, deletePostfix, createPostfix } = m.mutationPostfix;
    _.each(_.castArray(modelNames), modelName => {
      const mutationNames = [
        `${modelName}${updatePostfix}`,
        `${modelName}${deletePostfix}`,
        `${modelName}${createPostfix}`,
      ];
      log.trace(`Removing mutations for '${modelName}': ${mutationNames.map(n => `'${n}'`).join(', ')}`);
      schemaComposer.Mutation.removeField(mutationNames);
    });
  };

  m.addDefaultQueries = modelArg => {
    const { dxGroupPostfix, dxQueryPostfix, modelPostfix } = m.queryPostfix;
    const { addFindManyByMongoQuery, addFindByDevExtremeFilter, addDevExtremeGroup } = m.resolvers;

    const modelInfo = getModelInfo(modelArg);
    _.each(modelInfo, (model, modelName) => {
      const modelQueryName = `${modelName}${modelPostfix}`;
      log.trace(`Adding model Query '${modelQueryName}'`);
      schemaComposer.Query.addFields({ [modelQueryName]: addFindManyByMongoQuery({ model, modelName }).resolver });

      const devExtremeQueryName = `${modelName}${dxQueryPostfix}`;
      log.trace(`Adding DevExtreme Query '${devExtremeQueryName}'`);
      schemaComposer.Query.addFields({
        [devExtremeQueryName]: addFindByDevExtremeFilter({ model, modelName }).resolver,
      });

      const devExtremeGroupQueryName = `${modelName}${dxGroupPostfix}`;
      log.trace(`Adding DevExtreme Group Query '${devExtremeGroupQueryName}'`);
      schemaComposer.Query.addFields({ [devExtremeGroupQueryName]: addDevExtremeGroup({ model, modelName }).resolver });
    });
  };

  m.removeDefaultQueries = modelNames => {
    const { dxGroupPostfix, dxQueryPostfix, modelPostfix } = m.queryPostfix;
    _.each(_.castArray(modelNames), modelName => {
      const queryNames = [
        `${modelName}${modelPostfix}`,
        `${modelName}${dxQueryPostfix}`,
        `${modelName}${dxGroupPostfix}`,
      ];
      log.trace(`Removing queries for '${modelName}': ${queryNames.map(n => `'${n}'`).join(', ')}`);
      schemaComposer.Query.removeField(queryNames);
    });
  };

  m.addDatasets = async ({ datasetsModelName, datasetsResolvers, addQueriesAndMutationsForDatasetsInDb }) => {
    m.addDefaultQueries(datasetsModelName);

    const { cloneOne, createOne, deleteOne } = datasetsResolvers;
    const { createPostfix, deletePostfix } = m.mutationPostfix;
    schemaComposer.Mutation.addFields({
      [`datasets${createPostfix}`]: createOne,
      [`datasetsClone`]: cloneOne,
      [`datasets${deletePostfix}`]: deleteOne,
      // [`datasets${updatePostfix}`]: updateOne,
    });

    await addQueriesAndMutationsForDatasetsInDb();
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

  m.addAll = async () => {
    const { models } = appLib.appModel;
    const { appLookups, appTreeSelectors } = appLib;

    const allModelNames = _.keys(models);
    // do not generate for datasets since it's custom
    const modelNames = allModelNames.filter(modelName => modelName !== 'datasets');
    m.addDefaultQueries(modelNames);
    m.addDefaultMutations(modelNames);

    const datasetsModelName = 'datasets';
    const { datasetsResolvers, addQueriesAndMutationsForDatasetsInDb } = require('./datasets-collections')({
      appLib,
      datasetsModel: appLib.appModel.models[datasetsModelName],
      datasetsModelName,
      addDefaultQueries: m.addDefaultQueries,
      addDefaultMutations: m.addDefaultMutations,
      removeDefaultQueries: m.removeDefaultQueries,
      removeDefaultMutations: m.removeDefaultMutations,
    });

    await m.addDatasets({ datasetsModelName, datasetsResolvers, addQueriesAndMutationsForDatasetsInDb });

    addLookupsQueries(models, appLookups, log);
    addTreeselectorsQueries(models, appTreeSelectors, log);
  };

  return m;
};
