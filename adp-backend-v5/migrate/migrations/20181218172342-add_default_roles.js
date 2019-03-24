const Promise = require('bluebird');
const _ = require('lodash');
const { PERMISSIONS, ROLES } = require('../../lib/access/access-config')();

const systemRoles = [
  {
    name: ROLES.User,
    permissions: [PERMISSIONS.accessAsUser],
    system: true,
  },
  {
    name: ROLES.Guest,
    permissions: [PERMISSIONS.accessAsGuest],
    system: true,
  },
  {
    name: ROLES.SuperAdmin,
    permissions: [PERMISSIONS.accessAsSuperAdmin],
    system: true,
  },
];

function upsertSystemRoles(db) {
  return Promise.map(systemRoles, systemRole =>
    db
      .collection('roles')
      .updateOne({ name: systemRole.name }, { $set: systemRole }, { upsert: true })
  );
}

function rewriteUserRoles(db, user, roleNameToLookup) {
  const roleNames = user.roles;
  const roleLookups = roleNames.map(roleName => {
    if (_.isString(roleName)) {
      return roleNameToLookup[roleName];
    }
    return roleName;
  });
  return db.collection('users').updateOne({ _id: user._id }, { $set: { roles: roleLookups } });
}

function getRoleNameToLookup(db) {
  return db
    .collection('roles')
    .find()
    .toArray()
    .then(roles => {
      const roleNameToLookup = {};
      _.each(roles, role => {
        const roleName = role.name;
        roleNameToLookup[roleName] = {
          table: 'roles',
          label: roleName,
          _id: role._id,
        };
      });

      return roleNameToLookup;
    });
}

function getUsersWithStringRoles(db) {
  return db
    .collection('users')
    .find({ roles: { $type: 'string' } })
    .toArray();
}

exports.up = function(db) {
  return upsertSystemRoles(db)
    .then(() => Promise.all([getRoleNameToLookup(db), getUsersWithStringRoles(db)]))
    .then(([roleNameToLookup, usersWithStringRoles]) =>
      Promise.map(usersWithStringRoles, user => rewriteUserRoles(db, user, roleNameToLookup))
    );
};

exports.down = function(db) {
  return Promise.map(systemRoles, doc => db.collection('roles').deleteOne({ name: doc.name }));
};
