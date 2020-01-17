// const log = require('log4js').getLogger('lib/hooks');
const _ = require('lodash');
const Promise = require('bluebird');

module.exports = appLib => {
  const m = {};

  m.preHook = (schemaModel, userContext) => m.getHookPromiseForStage('pre', schemaModel, userContext);

  m.postHook = (schemaModel, userContext) => m.getHookPromiseForStage('post', schemaModel, userContext);

  m.getHookPromiseForStage = async (stage, schemaModel, userContext) => {
    const hookNames = _.get(schemaModel, `hooks.${stage}`);
    const hookFns = _.castArray(hookNames)
      .map(hookName => _.get(appLib.appModelHelpers.Hooks, hookName))
      .filter(hookFn => _.isFunction(hookFn));

    try {
      await Promise.mapSeries(hookFns, hookFn => hookFn({ schemaModel, userContext }));
    } catch (e) {
      throw new Error(`Error occurred on ${stage} hook stage of ${schemaModel.schemaName}`);
    }
  };

  // m.wrapInHooks = (schemaModel, userContext, promiseToWrap) => {
  //   return m.preHook(schemaModel, userContext)
  //     .then(() => promiseToWrap)
  // };

  return m;
};
