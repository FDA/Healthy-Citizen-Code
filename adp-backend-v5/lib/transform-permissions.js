const RJSON = require('relaxed-json');
const _ = require('lodash');

/**
 * Transfrorms permissions according to 'Listing App Permissions' https://confluence.conceptant.com/pages/viewpage.action?pageId=1016055
 */
function getTransformedInterfaceAppPermissions(permissions, errors) {
  if (_.isPlainObject(permissions)) {
    return permissions;
  }
  if (_.isArray(permissions)) {
    const appPermissions = {};
    permissions.forEach(permission => {
      if (_.isString(permission)) {
        appPermissions[permission] = { description: permission };
      } else {
        errors.push(
          `Found not string app permission ${RJSON.stringify(
            permission
          )} in interface.app.permissions`
        );
      }
    });
    return appPermissions;
  }
  return undefined;
}

function getAppModelWithTransformedPermissions(appModel, actionsToInject) {
  const appModelCopy = _.clone(appModel);
  _.each(appModelCopy, model => {
    _.each(model.scopes, scope => {
      const permissionName = scope.permissions;
      if (_.isString(permissionName) || _.isArray(permissionName)) {
        scope.permissions = {};
        _.each(actionsToInject, action => {
          scope.permissions[action] = permissionName;
        });
      }
    });
  });
  return appModelCopy;
}

function transformListPermissions(listsPaths, appModel) {
  _.each(listsPaths, listPath => {
    const { scopes } = _.get(appModel, listPath);
    _.each(scopes, scope => {
      const permissionName = scope.permissions;
      if (_.isString(permissionName) || _.isArray(permissionName)) {
        scope.permissions = {
          view: permissionName,
        };
      }
    });
  });
}

function transformMenuPermissions(mainMenuItems, actionsToInject) {
  _.each(mainMenuItems, menuItem => {
    transformMenuItemScopes(menuItem, actionsToInject);
  });
}

function transformMenuItemScopes(menuItem, actionsToInject) {
  _.each(menuItem.scopes, scope => {
    const permissionName = scope.permissions;
    if (_.isString(permissionName) || _.isArray(permissionName)) {
      scope.permissions = {};
      _.each(actionsToInject, action => {
        scope.permissions[action] = permissionName;
      });
    }
  });
  if (menuItem.type === 'MenuGroup') {
    _.each(menuItem.fields, subMenu => {
      transformMenuItemScopes(subMenu, actionsToInject);
    });
  }
}

function transformPagesPermissions(pages, actionsToInject) {
  _.each(pages, page => {
    _.each(page.scopes, scope => {
      const permissionName = scope.permissions;
      if (_.isString(permissionName) || _.isArray(permissionName)) {
        scope.permissions = {};
        _.each(actionsToInject, action => {
          scope.permissions[action] = permissionName;
        });
      }
    });
  });
}

module.exports = {
  getTransformedInterfaceAppPermissions,
  getAppModelWithTransformedPermissions,
  transformListPermissions,
  transformMenuPermissions,
  transformPagesPermissions,
};
