const { MONGO_CONST } = require('./backend-util');

const DEFAULT_AUTH_SETTINGS = {
  requireAuthentication: true,
  enableAuthentication: true,
  enableRegistration: true,
  enablePermissions: false,
  enableUserPasswordReset: true,
  requireMfa: false,
  enableMfa: false,
  mfaType: false,
};

// default system roles that do not depends on app model roles
const ROLES = {
  SuperAdmin: 'SuperAdmin',
  User: 'User',
  Guest: 'Guest',
};

// default system permissions not depending on app model permissions
const PERMISSIONS = {
  accessAsAnyone: 'accessAsAnyone',
  accessAsGuest: 'accessAsGuest',
  accessAsUser: 'accessAsUser',
  accessAsSuperAdmin: 'accessAsSuperAdmin',
  createUserAccounts: 'createUserAccounts',
  accessFromDesktop: 'accessFromDesktop',
  accessFromTv: 'accessFromTv',
  accessFromTablet: 'accessFromTablet',
  accessFromPhone: 'accessFromPhone',
  accessFromBot: 'accessFromBot',
  accessFromCar: 'accessFromCar',
};

const ROLES_TO_PERMISSIONS = {
  [ROLES.User]: [PERMISSIONS.accessAsUser],
  [ROLES.Guest]: [PERMISSIONS.accessAsGuest],
};

const DEFAULT_ACTIONS = ['create', 'clone', 'update', 'view', 'viewDetails', 'delete'];

const getAdminLookupScopeForViewAction = () => ({
  superAdminScope: {
    permissions: { view: PERMISSIONS.accessAsSuperAdmin },
    where: JSON.stringify(MONGO_CONST.EXPR.TRUE),
  },
});

const getAdminListScopeForViewAction = () => ({
  superAdminScope: {
    permissions: { view: PERMISSIONS.accessAsSuperAdmin },
    where: 'return true',
    return: 'return $list',
  },
});

module.exports = {
  DEFAULT_AUTH_SETTINGS,
  ROLES,
  PERMISSIONS,
  ROLES_TO_PERMISSIONS,
  DEFAULT_ACTIONS,
  getAdminLookupScopeForViewAction,
  getAdminListScopeForViewAction,
};
