const _ = require('lodash');
const log = require('log4js').getLogger('environment-controller');
const { handleGraphQlError } = require('../../lib/graphql/util');
const { getNewConfig, getEnvConfig } = require('../../config/util');
const GraphQlContext = require('../../lib/request-context/graphql/GraphQlContext');
const { getMongoParams } = require('../../lib/graphql/mutation');
const { AccessError, ValidationError } = require('../../lib/errors');

const environmentModelName = '_environment';

module.exports = () => {
  const m = {};

  m.init = async (appLib) => {
    m.appLib = appLib;
    wrapEnvironment();
  };

  function wrapEnvironment() {
    const {
      getCreateMutationName,
      getUpdateOneMutationName,
      wrapMutation,
      wrapQuery,
      getOrCreateTypeByModel,
      getDxQueryName,
      resolversNames,
      COMPOSER_TYPES,
    } = m.appLib.graphQl;

    const environmentOutputType = getOrCreateTypeByModel(environmentModelName, COMPOSER_TYPES.OUTPUT);
    const environmentCreateOneResolver = environmentOutputType.getResolver(resolversNames.createOneResolverName);
    const environmentDxQueryName = getDxQueryName(environmentModelName);
    wrapQuery(environmentDxQueryName, (next) => async (rp) => {
      try {
        const result = await next(rp);
        if (!_.isEmpty(result.items)) {
          return result;
        }

        // if access is not forbidden and record does not exist then create record with defaults on the fly
        const environmentDefaultRecord = getEnvConfig();
        const args = { record: environmentDefaultRecord };
        const environmentRecord = await environmentCreateOneResolver.resolve({ args, context: rp.context });
        result.items.push(environmentRecord);
        result.count = 1;

        return result;
      } catch (e) {
        if (e instanceof AccessError) {
          throw new Error('Access restricted');
        }
        handleGraphQlError({
          e,
          message: `Unable to get environment record`,
          log,
          appLib: m.appLib,
          modelName: environmentModelName,
        });
      }
    });

    wrapMutation(getCreateMutationName(environmentModelName), (next) => async (rp) => {
      try {
        const { req } = rp.context;
        const graphQlContext = await new GraphQlContext(m.appLib, req, environmentModelName, rp.args).init();

        const envItem = rp.args.record;
        await m.appLib.validation.validateNewItem(graphQlContext, envItem);
        const { inlineContext, appModel, userContext, mongoParams, userPermissions, modelName } = graphQlContext;
        const action = 'create';
        graphQlContext.userContext.action = action;

        await m.appLib.hooks.preHook(appModel, userContext);
        const scopeConditionsMeta = await m.appLib.accessUtil.getScopeConditionsMeta(
          appModel,
          userPermissions,
          inlineContext,
          action
        );
        const scopeConditions = scopeConditionsMeta.overallConditions;
        const mongoConditions = m.appLib.butil.MONGO.and(mongoParams.conditions, scopeConditions);
        if (mongoConditions === false) {
          throw new AccessError(`Not enough permissions to create the item.`);
        }
        const filteredEnvItem = m.appLib.accessUtil.filterDocFields(appModel, envItem, action, userPermissions);
        await m.appLib.transformers.preSaveTransformData(modelName, userContext, filteredEnvItem, []);

        const { errors, newConfig, newEnvConfig } = getNewConfig(filteredEnvItem, m.appLib.envConfig);
        if (errors) {
          throw new ValidationError(errors.join('\n'));
        }
        const createdRecord = await m.appLib.dba.createItemCheckingConditions(
          modelName,
          mongoConditions,
          userContext,
          filteredEnvItem
        );

        const oldConfig = m.appLib.config;
        m.appLib.config = newConfig;
        m.appLib.envConfig = newEnvConfig;
        await handleConfigChange(oldConfig, newConfig);

        return createdRecord;
      } catch (e) {
        return handleGraphQlError({
          e,
          message: `Unable to create environment record`,
          log,
          appLib: m.appLib,
          modelName: environmentModelName,
        });
      }
    });

    wrapMutation(getUpdateOneMutationName(environmentModelName), (next) => async (rp) => {
      try {
        const { req } = rp.context;
        const graphQlContext = await new GraphQlContext(m.appLib, req, environmentModelName, rp.args).init();
        graphQlContext.mongoParams = getMongoParams(rp.args);

        const { accessUtil, dba, controllerUtil, butil, validation, hooks } = m.appLib;
        const { items, meta } = await controllerUtil.getElements({ context: graphQlContext });
        const dbDoc = items[0];
        if (!dbDoc) {
          log.error(`Unable to update requested element. Meta: ${butil.getRequestMeta(graphQlContext, meta)}`);
          throw new ValidationError(`Unable to update requested element`);
        }

        const envItem = rp.args.record;
        await validation.validateNewItem(graphQlContext, envItem);
        const { appModel, modelName, userContext, mongoParams, userPermissions } = graphQlContext;
        graphQlContext.userContext.action = 'update';
        const { action } = graphQlContext.userContext;
        await hooks.preHook(appModel, userContext);

        const newData = accessUtil.mergeDocs({
          appModel,
          dbDoc,
          userData: envItem,
          action,
          userPermissions,
        });

        const { errors, newConfig, newEnvConfig } = getNewConfig(newData, m.appLib.envConfig);
        if (errors) {
          throw new ValidationError(errors.join('\n'));
        }

        const updatedItem = await dba.withTransaction(async (session) => {
          const item = await dba.updateItem({
            modelName,
            userContext,
            mongoConditions: mongoParams.conditions,
            data: newData,
            session,
          });
          await controllerUtil.updateLinkedRecords(newData, dbDoc, modelName, session);
          await hooks.postHook(appModel, userContext);
          return item;
        });

        const oldConfig = m.appLib.config;
        m.appLib.config = newConfig;
        m.appLib.envConfig = newEnvConfig;
        await handleConfigChange(oldConfig, newConfig);

        return updatedItem;
      } catch (e) {
        handleGraphQlError({
          e,
          message: `Unable to update env record`,
          log,
          appLib: m.appLib,
          modelName: environmentModelName,
        });
      }
    });
  }

  // eslint-disable-next-line no-unused-vars
  async function handleConfigChange(oldConfig, newConfig) {
    try {
      await m.appLib.mail.updateSmtpTransport();
    } catch (e) {
      log.error(e.stack);
    }
  }

  return m;
};
