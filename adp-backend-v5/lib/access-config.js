const {MONGO_CONST} = require('./backend-util');

const DEFAULT_AUTH_SETTINGS = {
  "requireAuthentication": true,
  "enableAuthentication": true,
  "enableRegistration": true,
  "enablePermissions": false,
  "enableUserPasswordReset": true,
  "requireMfa": false,
  "enableMfa": false,
  "mfaType": false
};

// default system roles that not depends on app model roles
const ROLES = {
  SuperAdmin: 'SuperAdmin',
  User: 'User',
  Guest: 'Guest',
};

// default system permissions that not depends on app model permissions
const PERMISSIONS = {
  accessAsGuest: 'accessAsGuest',
  accessAsUser: 'accessAsUser',
  accessAsSuperAdmin: 'accessAsSuperAdmin',
  createUserAccounts: 'createUserAccounts',
};

const ROLES_TO_PERMISSIONS = {
  [ROLES.User]: [PERMISSIONS.accessAsUser],
  [ROLES.Guest]: [PERMISSIONS.accessAsGuest]
};

const DEFAULT_ACTIONS = [
  'create',
  'clone',
  'update',
  'view',
  'viewDetails',
  'delete',
];

const getAdminLookupScopeForViewAction = () => {
  return {
    superAdminScope: {
      permissions: {
        view: PERMISSIONS.accessAsSuperAdmin
      },
      where: JSON.stringify(MONGO_CONST.EXPR.TRUE)
    }
  };
};

const getAdminListScopeForViewAction = () => {
  return {
    superAdminScope: {
      permissions: {
        view: PERMISSIONS.accessAsSuperAdmin
      },
      where: 'return true',
      'return': 'return $list'
    }
  };
};

module.exports = {
  DEFAULT_AUTH_SETTINGS,
  ROLES,
  PERMISSIONS,
  ROLES_TO_PERMISSIONS,
  DEFAULT_ACTIONS,
  getAdminLookupScopeForViewAction,
  getAdminListScopeForViewAction,
};
