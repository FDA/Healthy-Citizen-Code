const Promise = require('bluebird');
const _ = require('lodash');
const { PERMISSIONS, ROLES } = require('../../lib/access/access-config');

// TODO: move getConditionForActualRecord from '../../lib/database-abstraction' and use it here;
const conditionForActualRecord = { deletedAt: new Date(0) };

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
_.each(systemRoles, r => {
  _.merge(r, conditionForActualRecord);
});

function upsertSystemRoles(db) {
  return Promise.map(systemRoles, systemRole =>
    db.collection('roles').updateOne({ name: systemRole.name }, { $set: systemRole }, { upsert: true })
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

async function getRoleNameToLookup(db) {
  const roles = await db
    .collection('roles')
    .find()
    .toArray();
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
}

function getUsersWithStringRoles(db) {
  return db
    .collection('users')
    .find({ roles: { $type: 'string' } })
    .toArray();
}

exports.up = async function(db) {
  await upsertSystemRoles(db);
  const [roleNameToLookup, usersWithStringRoles] = await Promise.all([
    getRoleNameToLookup(db),
    getUsersWithStringRoles(db),
  ]);
  return Promise.map(usersWithStringRoles, user => rewriteUserRoles(db, user, roleNameToLookup));
};

exports.down = function(db) {
  return Promise.map(systemRoles, doc => db.collection('roles').deleteOne({ name: doc.name }));
};
