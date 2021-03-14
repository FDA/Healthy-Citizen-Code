module.exports = {
  // default system permissions that do not depend on app model permissions
  // these permissions cannot be assigned to a user created role
  PERMISSIONS: {
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
    accessForbidden: 'accessForbidden',
  },
  DEFAULT_AUTH_SETTINGS: {
    requireAuthentication: true,
    enableAuthentication: true,
    enableRegistration: true,
    enablePermissions: false,
    enableUserPasswordReset: true,
    requireMfa: false,
    enableMfa: false,
    mfaType: false,
  },
  // default system roles that do not depend on app model roles
  ROLES: {
    SuperAdmin: 'SuperAdmin',
    User: 'User',
    Guest: 'Guest',
  },
  DEFAULT_ACTIONS: [
    'create',
    'clone',
    'update',
    'view',
    'viewDetails',
    'delete',
    'upsert',
    'group',
    'search',
    'print',
    'manageViews',
    'quickFilter',
    'export',
    'import',
    'syntheticGenerate',
    'chooseColumns',
    'listFilter',
  ],
};
