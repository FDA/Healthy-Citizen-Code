/**
 * Hooks to be invoked for records
 */
// const _ = require('lodash');

module.exports = appLib => {
  const m = {
    cacheRolesToPermissions({ modelName, action }) {
      if (modelName === 'roles' && ['create', 'update', 'delete'].includes(action)) {
        return appLib.accessUtil
          .getRolesToPermissions()
          .then(rolesToPermissions =>
            appLib.cache.setCache(appLib.cache.keys.ROLES_TO_PERMISSIONS, rolesToPermissions)
          );
      }
      return Promise.resolve();
    },
  };
  return m;
};
