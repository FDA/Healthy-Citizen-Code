const _ = require('lodash');
const RJSON = require('relaxed-json');
const Promise = require('bluebird');
const log = require('log4js').getLogger('lib/graphql');
const { ValidationError } = require('../errors');

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

  m.getDb = (modelName) => appLib.db.model(modelName);

  m.getModel = (modelName) => appLib.appModel.models[modelName];

  m.addQuery = (queryName, resolver) => {
    schemaComposer.Query.addFields({ [queryName]: resolver });
  };

  m.removeQueries = (queryName) => {
    schemaComposer.Query.removeField(queryName);
  };

  m.addMutation = (mutationName, resolver) => {
    schemaComposer.Mutation.addFields({ [mutationName]: resolver });
  };

  m.removeMutations = (mutationNames) => {
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
  m.getDxQueryName = (modelName) => {
    return `${modelName}${m.queryPostfix.dxQueryPostfix}`;
  };
  m.getDxGroupQueryName = (modelName) => {
    return `${modelName}${m.queryPostfix.dxGroupPostfix}`;
  };
  m.getModelQueryName = (modelName) => {
    return `${modelName}${m.queryPostfix.modelPostfix}`;
  };

  m.mutationPostfix = {
    updatePostfix: `UpdateOne`,
    deletePostfix: `DeleteOne`,
    createPostfix: `Create`,
  };
  m.getUpdateMutationName = (modelName) => {
    return `${modelName}${m.mutationPostfix.updatePostfix}`;
  };
  m.getDeleteMutationName = (modelName) => {
    return `${modelName}${m.mutationPostfix.deletePostfix}`;
  };
  m.getCreateMutationName = (modelName) => {
    return `${modelName}${m.mutationPostfix.createPostfix}`;
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

  m.addDefaultMutations = (modelArg) => {
    const { addCreateOne, addUpdateOne, addDeleteOne } = m.resolvers;

    const modelInfo = getModelInfo(modelArg);
    _.each(modelInfo, (model, modelName) => {
      const createMutationName = m.getCreateMutationName(modelName);
      log.trace(`Adding create mutation '${createMutationName}'`);
      schemaComposer.Mutation.addFields({ [createMutationName]: addCreateOne({ model, modelName }).resolver });

      const updateMutationName = m.getUpdateMutationName(modelName);
      log.trace(`Adding update mutation '${updateMutationName}'`);
      schemaComposer.Mutation.addFields({ [updateMutationName]: addUpdateOne({ model, modelName }).resolver });

      const deleteMutationName = m.getDeleteMutationName(modelName);
      log.trace(`Adding delete mutation '${deleteMutationName}'`);
      schemaComposer.Mutation.addFields({ [deleteMutationName]: addDeleteOne({ model, modelName }).resolver });

      // [`${modelName}UpsertOne`]: type.getResolver('upsertOne'),
    });
  };

  m.removeDefaultMutations = (modelNames) => {
    _.each(_.castArray(modelNames), (modelName) => {
      const mutationNames = [
        m.getCreateMutationName(modelName),
        m.getUpdateMutationName(modelName),
        m.getDeleteMutationName(modelName),
      ];
      log.trace(`Removing mutations for '${modelName}': ${mutationNames.map((n) => `'${n}'`).join(', ')}`);
      schemaComposer.Mutation.removeField(mutationNames);
    });
  };

  m.addDefaultQueries = (modelArg) => {
    const { addFindManyByMongoQuery, addFindByDevExtremeFilter, addDevExtremeGroup } = m.resolvers;

    const modelInfo = getModelInfo(modelArg);
    _.each(modelInfo, (model, modelName) => {
      const modelQueryName = m.getModelQueryName(modelName);
      log.trace(`Adding model Query '${modelQueryName}'`);
      schemaComposer.Query.addFields({ [modelQueryName]: addFindManyByMongoQuery({ model, modelName }).resolver });

      const devExtremeQueryName = m.getDxQueryName(modelName);
      log.trace(`Adding DevExtreme Query '${devExtremeQueryName}'`);
      schemaComposer.Query.addFields({
        [devExtremeQueryName]: addFindByDevExtremeFilter({ model, modelName }).resolver,
      });

      const devExtremeGroupQueryName = m.getDxGroupQueryName(modelName);
      log.trace(`Adding DevExtreme Group Query '${devExtremeGroupQueryName}'`);
      schemaComposer.Query.addFields({ [devExtremeGroupQueryName]: addDevExtremeGroup({ model, modelName }).resolver });
    });
  };

  m.removeDefaultQueries = (modelNames) => {
    _.each(_.castArray(modelNames), (modelName) => {
      const queryNames = [
        m.getModelQueryName(modelName),
        m.getDxQueryName(modelName),
        m.getDxGroupQueryName(modelName),
      ];
      log.trace(`Removing queries for '${modelName}': ${queryNames.map((n) => `'${n}'`).join(', ')}`);
      schemaComposer.Query.removeField(queryNames);
    });
  };

  m.addDatasets = async ({
    datasetsModelName,
    datasetsResolvers,
    transformDatasetsRecord,
    addQueriesAndMutationsForDatasetsInDb,
  }) => {
    const { addFindManyByMongoQuery, addFindByDevExtremeFilter, addDevExtremeGroup } = m.resolvers;

    const queryWrapper = (next) => async (rp) => {
      const result = await next(rp);

      const { req } = rp.context;
      const { getReqPermissions, getInlineContext } = appLib.accessUtil;
      const userPermissions = getReqPermissions(req);
      const inlineContext = getInlineContext(req);
      if (_.isArray(result.items)) {
        await Promise.map(result.items, (item) => transformDatasetsRecord(item, userPermissions, inlineContext));
      }

      return result;
    };

    const modelInfo = getModelInfo(datasetsModelName);
    _.each(modelInfo, (model, modelName) => {
      const modelQueryName = m.getModelQueryName(modelName);
      log.trace(`Adding model Query '${modelQueryName}'`);
      schemaComposer.Query.addFields({
        [modelQueryName]: addFindManyByMongoQuery({ model, modelName }).resolver.wrapResolve(queryWrapper),
      });

      const devExtremeQueryName = m.getDxQueryName(modelName);
      log.trace(`Adding DevExtreme Query '${devExtremeQueryName}'`);
      schemaComposer.Query.addFields({
        [devExtremeQueryName]: addFindByDevExtremeFilter({ model, modelName }).resolver.wrapResolve(queryWrapper),
      });

      const devExtremeGroupQueryName = m.getDxGroupQueryName(modelName);
      log.trace(`Adding DevExtreme Group Query '${devExtremeGroupQueryName}'`);
      schemaComposer.Query.addFields({
        [devExtremeGroupQueryName]: addDevExtremeGroup({ model, modelName }).resolver.wrapResolve(queryWrapper),
      });
    });

    const { cloneOne, createOne, deleteOne, updateOne } = datasetsResolvers;
    const modelName = 'datasets';
    const createMutationName = m.getCreateMutationName(modelName);
    const updateMutationName = m.getUpdateMutationName(modelName);
    const deleteMutationName = m.getDeleteMutationName(modelName);

    schemaComposer.Mutation.addFields({
      [createMutationName]: createOne,
      [updateMutationName]: updateOne,
      [deleteMutationName]: deleteOne,
      [`${modelName}Clone`]: cloneOne,
    });

    await addQueriesAndMutationsForDatasetsInDb();
  };

  /**
   * Methods getMutationResolver, getQueryResolver exists only because there is no way (at least I couldn't find it) to get resolver by query/mutation name
   * - schemaComposer.Mutation.get(name) returns type, not resolver. This type may contain multiple resolvers.
   * - schemaComposer.Mutation.getField(name) returns field. This field is of object type and contains resolve function, not resolver.
   * Maybe there is a way to get resolver by resolve function but it seems like a crutch
   */
  m.getMutationResolver = (mutationName) => {
    const mutationField = schemaComposer.Mutation.get(mutationName);
    if (!mutationField) {
      return null;
    }

    const { updatePostfix, deletePostfix, createPostfix } = m.mutationPostfix;
    if (mutationName.endsWith(updatePostfix)) {
      const type = getBaseType(mutationName, updatePostfix);
      return type.getResolver(updateOneResolverName);
    }
    if (mutationName.endsWith(deletePostfix)) {
      const type = getBaseType(mutationName, deletePostfix);
      return type.getResolver(deleteOneResolverName);
    }
    if (mutationName.endsWith(createPostfix)) {
      const type = getBaseType(mutationName, createPostfix);
      return type.getResolver(createOneResolverName);
    }
    return null;

    function getBaseType(mutationFieldName, postfix) {
      const baseTypeName = mutationFieldName.replace(new RegExp(`${postfix}$`), '');
      return schemaComposer.get(baseTypeName);
    }
  };

  m.wrapMutation = (mutationName, wrapper) => {
    try {
      const mutationResolver = m.getMutationResolver(mutationName);
      m.addMutation(mutationName, mutationResolver.wrapResolve(wrapper));
    } catch (e) {
      throw new Error(`Unable to wrap mutation '${mutationName}'. ${e.stack}`);
    }
  };

  m.getQueryResolver = (queryName) => {
    const queryField = schemaComposer.Query.get(queryName);
    if (!queryField) {
      return null;
    }

    const { dxGroupPostfix, dxQueryPostfix, modelPostfix } = m.queryPostfix;
    if (queryName.endsWith(dxGroupPostfix)) {
      return queryField.getResolver(devExtremeGroupResolverName);
    }
    if (queryName.endsWith(dxQueryPostfix)) {
      return queryField.getResolver(paginationFindByDevExtremeFilterResolverName);
    }
    if (queryName.endsWith(modelPostfix)) {
      return queryField.getResolver(paginationFindByMongoQueryResolverName);
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

  m.addBackgroundJobs = async (backgroundJobsModelName) => {
    const backgroundJobsModel = appLib.appModel.models[backgroundJobsModelName];
    const { backgroundJobsResolvers } = require('./background-jobs')({ backgroundJobsModel, backgroundJobsModelName });

    const devExtremeQueryName = m.getDxQueryName(backgroundJobsModelName);
    log.trace(`Adding DevExtreme Query '${devExtremeQueryName}'`);
    schemaComposer.Query.addFields({
      [devExtremeQueryName]: backgroundJobsResolvers.pagination,
    });

    const deleteMutationName = m.getDeleteMutationName(backgroundJobsModelName);
    log.trace(`Adding Delete Mutation '${deleteMutationName}'`);
    schemaComposer.Mutation.addFields({
      [deleteMutationName]: backgroundJobsResolvers.deleteOne,
    });
  };

  m.addImportData = () => {
    const { resolver: importResolver } = require('./import-data')(appLib);
    schemaComposer.Mutation.addFields({ universalImportData: importResolver });
  };

  m.addQuickFilters = () => {
    const modelName = 'quickFilters';
    const { testQuickFilterResolver } = require('./quick-filter')();
    schemaComposer.Query.addFields({ testQuickFilter: testQuickFilterResolver });
    const testQuickFilterWrapper = (next) => async (rp) => {
      let conditions;
      try {
        conditions = RJSON.parse(rp.args.record.filter);
      } catch (e) {
        throw new ValidationError(`Invalid filter string. ${e.message}`);
      }
      if (!_.isPlainObject(conditions)) {
        throw new ValidationError(`Invalid filter string, must be an object representing mongo conditions`);
      }

      return next(rp);
    };

    const createMutationName = m.getCreateMutationName(modelName);
    const updateMutationName = m.getUpdateMutationName(modelName);
    m.wrapMutation(createMutationName, testQuickFilterWrapper);
    m.wrapMutation(updateMutationName, testQuickFilterWrapper);
  };

  m.addAll = async () => {
    const { models } = appLib.appModel;
    const { appLookups, appTreeSelectors } = appLib;

    const allModelNames = _.keys(models);

    const datasetsModelName = 'datasets';
    const backgroundJobsModelName = 'backgroundJobs';
    const customModels = [datasetsModelName, backgroundJobsModelName];

    const regularModelNames = allModelNames.filter((modelName) => !customModels.includes(modelName));
    m.addDefaultQueries(regularModelNames);
    m.addDefaultMutations(regularModelNames);

    const {
      datasetsResolvers,
      transformDatasetsRecord,
      addQueriesAndMutationsForDatasetsInDb,
    } = require('./datasets-collections')({
      appLib,
      datasetsModel: appLib.appModel.models[datasetsModelName],
      datasetsModelName,
      addDefaultQueries: m.addDefaultQueries,
      addDefaultMutations: m.addDefaultMutations,
      removeDefaultQueries: m.removeDefaultQueries,
      removeDefaultMutations: m.removeDefaultMutations,
    });

    await m.addDatasets({
      datasetsModelName,
      datasetsResolvers,
      transformDatasetsRecord,
      addQueriesAndMutationsForDatasetsInDb,
    });

    await m.addBackgroundJobs(backgroundJobsModelName);
    await m.addImportData();
    await m.addQuickFilters();

    addLookupsQueries(models, appLookups, log);
    addTreeselectorsQueries(models, appTreeSelectors, log);
  };

  return m;
};
