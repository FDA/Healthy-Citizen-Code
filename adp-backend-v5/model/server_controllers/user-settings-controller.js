const _ = require('lodash');
const log = require('log4js').getLogger('user-settings-controller');
const { handleGraphQlError } = require('../../lib/graphql/util');

const userSettingsModelName = '_userSettings';

module.exports = () => {
  const m = {};

  m.init = async (appLib) => {
    m.appLib = appLib;
    wrapUserSettings();
  };

  function wrapUserSettings() {
    const { getDxQueryName, wrapQuery, getOrCreateTypeByModel, COMPOSER_TYPES, resolversNames } = m.appLib.graphQl;

    const userSettingsOutputType = getOrCreateTypeByModel(userSettingsModelName, COMPOSER_TYPES.OUTPUT);
    const userSettingsCreateOneResolver = userSettingsOutputType.getResolver(resolversNames.createOneResolverName);

    const userSettingsDxQueryName = getDxQueryName(userSettingsModelName);
    wrapQuery(userSettingsDxQueryName, (next) => async (rp) => {
      try {
        const result = await next(rp);
        if (!_.isEmpty(result.items)) {
          return result;
        }

        // create record with defaults on the fly
        const userSettingsDefaultRecord = m.appLib.accessUtil.getUserSettingsMergedWithDefaults({}, false);
        const args = { record: userSettingsDefaultRecord };
        const userSettingsRecord = await userSettingsCreateOneResolver.resolve({ args, context: rp.context });
        result.items.push(userSettingsRecord);
        result.count = 1;

        return result;
      } catch (e) {
        handleGraphQlError(e, `Unable to get userSettings`, log, m.appLib);
      }
    });
  }

  return m;
};
