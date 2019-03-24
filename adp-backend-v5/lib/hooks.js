const log = require('log4js').getLogger('lib/hooks');
const _ = require('lodash');
const Promise = require('bluebird');

module.exports = appLib => {
  const m = {};

  m.getPreHookPromise = (modelName, req, action) =>
    m.getHookPromiseForStage('pre', modelName, req, action);

  m.getPostHookPromise = (modelName, req, action) =>
    m.getHookPromiseForStage('post', modelName, req, action);

  m.getHookPromiseForStage = (stage, modelName, req, action) => {
    const hookNames = _.get(appLib.appModel.models, `${modelName}.hooks.${stage}`);
    const hookFns = _.castArray(hookNames)
      .map(hookName => _.get(appLib.appModelHelpers.Hooks, hookName))
      .filter(hookFn => _.isFunction(hookFn));

    return Promise.mapSeries(hookFns, hookFn => hookFn({ modelName, req, action })).catch(err => {
      log.error(`Error occurred on ${stage} hook stage of ${modelName}: ${err}`);
      throw err;
    });
  };

  return m;
};
