const JSON5 = require('json5');
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
    permissions.forEach((permission) => {
      if (_.isString(permission)) {
        appPermissions[permission] = { description: permission };
      } else {
        errors.push(`Found not string app permission ${JSON5.stringify(permission)} in interface.app.permissions`);
      }
    });
    return appPermissions;
  }
  return undefined;
}

function expandPermissionsForScope(scope, actions) {
  const permissionName = scope.permissions;
  if (_.isString(permissionName) || _.isArray(permissionName)) {
    scope.permissions = {};
    _.each(actions, (action) => {
      scope.permissions[action] = permissionName;
    });
  }

  if (scope.where === 'true' || scope.where === 'false') {
    scope.where = JSON.parse(scope.where);
  } else if (_.isNil(scope.where) || scope.where === '') {
    scope.where = true;
  }
}

function expandPermissionsForScopes(scopes, actions) {
  _.each(scopes, (scope) => {
    expandPermissionsForScope(scope, actions);
  });
}

function transformMenuPermissions(mainMenuItems, actionsToInject) {
  _.each(mainMenuItems, (menuItem, menuKey) => {
    transformMenuItemScopes(mainMenuItems, menuKey, actionsToInject);
  });
}

function transformMenuItemScopes(parentMenuObj, menuKey, actionsToInject) {
  const menuItem = parentMenuObj[menuKey];
  if (!_.isPlainObject(menuItem)) {
    delete parentMenuObj[menuKey];
    return;
  }

  expandPermissionsForScopes(menuItem.scopes, actionsToInject);
  if (menuItem.type === 'MenuGroup') {
    _.each(menuItem.fields, (subMenu, subMenuKey) => {
      transformMenuItemScopes(menuItem.fields, subMenuKey, actionsToInject);
    });
  }
}

function transformPagesPermissions(pages, actionsToInject) {
  _.each(pages, (page) => expandPermissionsForScopes(page.scopes, actionsToInject));
}

module.exports = {
  getTransformedInterfaceAppPermissions,
  transformMenuPermissions,
  transformPagesPermissions,
  expandPermissionsForScopes,
  expandPermissionsForScope,
};
