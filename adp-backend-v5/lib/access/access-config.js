module.exports = function() {
  const m = {};

  // default system permissions that do not depend on app model permissions
  m.PERMISSIONS = {
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

  m.DEFAULT_AUTH_SETTINGS = {
    requireAuthentication: true,
    enableAuthentication: true,
    enableRegistration: true,
    enablePermissions: false,
    enableUserPasswordReset: true,
    requireMfa: false,
    enableMfa: false,
    mfaType: false,
  };

  // default system roles that do not depend on app model roles
  m.ROLES = {
    SuperAdmin: 'SuperAdmin',
    User: 'User',
    Guest: 'Guest',
  };

  m.DEFAULT_ACTIONS = ['create', 'clone', 'update', 'view', 'viewDetails', 'delete'];

  return m;
};
