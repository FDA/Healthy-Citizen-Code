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
        errors.push(`Found not string app permission ${RJSON.stringify(permission)} in interface.app.permissions`);
      }
    });
    return appPermissions;
  }
  return undefined;
}

function expandPermissionsForScopes(scopes, actions) {
  _.each(scopes, scope => {
    const permissionName = scope.permissions;
    if (_.isString(permissionName) || _.isArray(permissionName)) {
      scope.permissions = {};
      _.each(actions, action => {
        scope.permissions[action] = permissionName;
      });
    }
  });
}

function getAppModelWithTransformedPermissions(appModel) {
  const appModelCopy = _.cloneDeep(appModel);
  _.each(appModelCopy, model => {
    const modelActionNames = _.keys(_.get(model, 'actions.fields'));
    expandPermissionsForScopes(model.scopes, modelActionNames);
  });
  return appModelCopy;
}

function transformListPermissions(listsFields, appModel) {
  _.each(listsFields, listField => {
    const listPath = `${listField}.list`;
    const { scopes } = _.get(appModel, listPath);
    expandPermissionsForScopes(scopes, ['view']);
  });
}

function transformMenuPermissions(mainMenuItems, actionsToInject) {
  _.each(mainMenuItems, menuItem => {
    transformMenuItemScopes(menuItem, actionsToInject);
  });
}

function transformMenuItemScopes(menuItem, actionsToInject) {
  expandPermissionsForScopes(menuItem.scopes, actionsToInject);
  if (menuItem.type === 'MenuGroup') {
    _.each(menuItem.fields, subMenu => {
      transformMenuItemScopes(subMenu, actionsToInject);
    });
  }
}

function transformPagesPermissions(pages, actionsToInject) {
  _.each(pages, page => expandPermissionsForScopes(page.scopes, actionsToInject));
}

module.exports = {
  getTransformedInterfaceAppPermissions,
  getAppModelWithTransformedPermissions,
  transformListPermissions,
  transformMenuPermissions,
  transformPagesPermissions,
  expandPermissionsForScopes,
};
