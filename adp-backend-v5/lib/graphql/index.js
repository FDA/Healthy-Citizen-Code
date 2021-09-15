const _ = require('lodash');
const JSON5 = require('json5');
const graphql = require('graphql');
const log = require('log4js').getLogger('lib/graphql');
const { ValidationError } = require('../errors');
const { getOrderedList } = require('../util/util');

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
const { addValidateFilterResolver } = require('./query/validate-query-resolver');
const {
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
} = require('./mutation');

module.exports = (appLib, graphQlRoute, altairRoute) => {
  const m = {};
  m.graphqlCompose = require('graphql-compose');
  const { schemaComposer } = m.graphqlCompose;

  m.connect = require(`./connect`)(appLib, graphQlRoute, altairRoute);

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
    addUpdateMany({ model, modelName }) {
      return addUpdateManyResolver(model || m.getModel(modelName), modelName);
    },
    addDeleteOne({ model, modelName }) {
      return addDeleteOneResolver(model || m.getModel(modelName), modelName);
    },
    addDeleteMany({ model, modelName }) {
      return addDeleteManyResolver(model || m.getModel(modelName), modelName);
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

  m.getOrCreateTypeByModel = (modelName, composerType) =>
    getOrCreateTypeByModel(m.getModel(modelName), modelName, composerType);
  m.COMPOSER_TYPES = require('./type/common').COMPOSER_TYPES;

  m.queryPostfix = {
    dxQueryPostfix: `Dx`,
    dxGroupPostfix: `DxGroup`,
    modelPostfix: ``,
  };
  m.getDxQueryName = (modelName) => `${modelName}${m.queryPostfix.dxQueryPostfix}`;
  m.getDxGroupQueryName = (modelName) => `${modelName}${m.queryPostfix.dxGroupPostfix}`;
  m.getModelQueryName = (modelName) => `${modelName}${m.queryPostfix.modelPostfix}`;

  m.mutationPostfix = {
    updateOnePostfix: `UpdateOne`,
    updateManyPostfix: `UpdateMany`,
    deletePostfix: `DeleteOne`,
    deleteManyPostfix: `DeleteMany`,
    createPostfix: `Create`,
  };
  m.getUpdateOneMutationName = (modelName) => `${modelName}${m.mutationPostfix.updateOnePostfix}`;
  m.getUpdateManyMutationName = (modelName) => `${modelName}${m.mutationPostfix.updateManyPostfix}`;
  m.getDeleteMutationName = (modelName) => `${modelName}${m.mutationPostfix.deletePostfix}`;
  m.getDeleteManyMutationName = (modelName) => `${modelName}${m.mutationPostfix.deleteManyPostfix}`;
  m.getCreateMutationName = (modelName) => `${modelName}${m.mutationPostfix.createPostfix}`;

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
    const { addCreateOne, addUpdateOne, addUpdateMany, addDeleteOne, addDeleteMany } = m.resolvers;

    const modelInfo = getModelInfo(modelArg);
    _.each(modelInfo, (model, modelName) => {
      const createMutationName = m.getCreateMutationName(modelName);
      log.trace(`Adding create mutation '${createMutationName}'`);
      schemaComposer.Mutation.addFields({ [createMutationName]: addCreateOne({ model, modelName }).resolver });

      const updateOneMutationName = m.getUpdateOneMutationName(modelName);
      log.trace(`Adding updateOne mutation '${updateOneMutationName}'`);
      schemaComposer.Mutation.addFields({ [updateOneMutationName]: addUpdateOne({ model, modelName }).resolver });

      const updateManyMutationName = m.getUpdateManyMutationName(modelName);
      log.trace(`Adding updateMany mutation '${updateManyMutationName}'`);
      schemaComposer.Mutation.addFields({ [updateManyMutationName]: addUpdateMany({ model, modelName }).resolver });

      const deleteMutationName = m.getDeleteMutationName(modelName);
      log.trace(`Adding delete mutation '${deleteMutationName}'`);
      schemaComposer.Mutation.addFields({ [deleteMutationName]: addDeleteOne({ model, modelName }).resolver });

      const deleteManyMutationName = m.getDeleteManyMutationName(modelName);
      log.trace(`Adding multi delete mutation '${deleteManyMutationName}'`);
      schemaComposer.Mutation.addFields({ [deleteManyMutationName]: addDeleteMany({ model, modelName }).resolver });
      // [`${modelName}UpsertOne`]: type.getResolver('upsertOne'),
    });
  };

  m.removeDefaultMutations = (modelNames) => {
    _.each(_.castArray(modelNames), (modelName) => {
      const mutationNames = [
        m.getCreateMutationName(modelName),
        m.getUpdateOneMutationName(modelName),
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

  m.addDatasets = async ({ datasetsResolvers, datasetsModelName }) => {
    const { addFindManyByMongoQuery, addFindByDevExtremeFilter, addDevExtremeGroup } = m.resolvers;

    const modelInfo = getModelInfo(datasetsModelName);
    _.each(modelInfo, (model, modelName) => {
      const modelQueryName = m.getModelQueryName(modelName);
      log.trace(`Adding model Query '${modelQueryName}'`);
      schemaComposer.Query.addFields({
        [modelQueryName]: addFindManyByMongoQuery({ model, modelName }).resolver,
      });

      const devExtremeQueryName = m.getDxQueryName(modelName);
      log.trace(`Adding DevExtreme Query '${devExtremeQueryName}'`);
      schemaComposer.Query.addFields({
        [devExtremeQueryName]: addFindByDevExtremeFilter({ model, modelName }).resolver,
      });

      const devExtremeGroupQueryName = m.getDxGroupQueryName(modelName);
      log.trace(`Adding DevExtreme Group Query '${devExtremeGroupQueryName}'`);
      schemaComposer.Query.addFields({
        [devExtremeGroupQueryName]: addDevExtremeGroup({ model, modelName }).resolver,
      });
    });

    const { createOne, deleteOne, updateOne, getSingleDataset } = datasetsResolvers;
    schemaComposer.Query.addFields({ getSingleDataset });

    const createMutationName = m.getCreateMutationName(datasetsModelName);
    const updateMutationName = m.getUpdateOneMutationName(datasetsModelName);
    const deleteMutationName = m.getDeleteMutationName(datasetsModelName);
    schemaComposer.Mutation.addFields({
      [createMutationName]: createOne,
      [updateMutationName]: updateOne,
      [deleteMutationName]: deleteOne,
    });
  };

  /**
   * Methods getMutationResolver, getQueryResolver exists only because there is no way (at least I couldn't find it) to get resolver by query/mutation name
   * - schemaComposer.Mutation.get(name) returns type, not resolver. This type may contain multiple resolvers.
   * - schemaComposer.Mutation.getField(name) returns field. This field is of object type and contains resolve function, not resolver.
   * Maybe there is a way to get resolver by resolve function but it seems like a crutch
   * TODO: add meta info for modelName to get mutation names and resolvers
   */
  m.getMutationResolver = (mutationName) => {
    const mutationField = schemaComposer.Mutation.get(mutationName);
    if (!mutationField) {
      return null;
    }

    const { updateOnePostfix, updateManyPostfix, deletePostfix, deleteManyPostfix, createPostfix } = m.mutationPostfix;
    if (mutationName.endsWith(updateOnePostfix)) {
      const type = getBaseType(mutationName, updateOnePostfix);
      return type.getResolver(updateOneResolverName);
    }
    if (mutationName.endsWith(updateManyPostfix)) {
      const type = getBaseType(mutationName, updateManyPostfix);
      return type.getResolver(updateManyResolverName);
    }
    if (mutationName.endsWith(deletePostfix)) {
      const type = getBaseType(mutationName, deletePostfix);
      return type.getResolver(deleteOneResolverName);
    }
    if (mutationName.endsWith(deleteManyPostfix)) {
      const type = getBaseType(mutationName, deleteManyPostfix);
      return type.getResolver(deleteManyResolverName);
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

  m.addBackgroundJobs = async ({ backgroundJobsResolvers }) => {
    const devExtremeQueryName = m.getDxQueryName(m.backgroundJobsModelName);
    log.trace(`Adding DevExtreme Query '${devExtremeQueryName}'`);
    schemaComposer.Query.addFields({
      [devExtremeQueryName]: backgroundJobsResolvers.pagination,
    });

    const deleteMutationName = m.getDeleteMutationName(m.backgroundJobsModelName);
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
        conditions = JSON5.parse(rp.args.record.filter);
      } catch (e) {
        throw new ValidationError(`Invalid filter string. ${e.message}`);
      }
      if (!_.isPlainObject(conditions)) {
        throw new ValidationError(`Invalid filter string, must be an object representing mongo conditions`);
      }

      return next(rp);
    };

    const createMutationName = m.getCreateMutationName(modelName);
    const updateMutationName = m.getUpdateOneMutationName(modelName);
    m.wrapMutation(createMutationName, testQuickFilterWrapper);
    m.wrapMutation(updateMutationName, testQuickFilterWrapper);
  };

  m.backgroundJobsModelName = 'backgroundJobs';
  m.datasetUtil = require('./datasets-collections/util');

  m.addAll = async () => {
    const { models } = appLib.appModel;

    const allModelNames = _.keys(models);
    const { datasetsResolvers, datasetsModelName } = require('./datasets-collections')({ appLib });
    const { backgroundJobsResolvers } = require('./background-jobs')({
      appLib,
      backgroundJobsModelName: m.backgroundJobsModelName,
    });

    const customModels = [datasetsModelName, m.backgroundJobsModelName];
    const regularModelNames = allModelNames.filter((modelName) => !customModels.includes(modelName));
    m.addDefaultQueries(regularModelNames);
    m.addDefaultMutations(regularModelNames);

    await m.addDatasets({ datasetsResolvers, datasetsModelName });
    await m.addBackgroundJobs({ backgroundJobsResolvers });

    await m.addImportData();
    await m.addQuickFilters();
    await addValidateFilterResolver();

    const { appLookups, appTreeSelectors } = appLib;
    addLookupsQueries(models, appLookups, log);
    addTreeselectorsQueries(models, appTreeSelectors, log);

    const graphQLSchema = schemaComposer.buildSchema();
    const graphQLErrors = graphql.validateSchema(graphQLSchema);
    if (!_.isEmpty(graphQLErrors)) {
      throw new ValidationError(`Graphql errors:\n${getOrderedList(graphQLErrors)}`);
    }
  };

  return m;
};
