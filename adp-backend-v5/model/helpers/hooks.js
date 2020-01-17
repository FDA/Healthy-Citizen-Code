/**
 * Hooks to be invoked for records
 */
// const _ = require('lodash');
const log = require('log4js').getLogger('helpers/hooks');

module.exports = appLib => {
  const m = {
    async cacheRolesToPermissions({ modelName, userContext }) {
      const { action } = userContext;
      if (modelName === 'roles' && ['create', 'update', 'delete'].includes(action)) {
        const rolesToPermissions = await appLib.accessUtil.getRolesToPermissions();
        try {
          await appLib.cache.setCache(appLib.cache.keys.ROLES_TO_PERMISSIONS, rolesToPermissions);
        } catch (e) {
          log.warn(`Unable to set cache for hook cacheRolesToPermissions.`);
        }
      }
    },
  };

  return m;
};
