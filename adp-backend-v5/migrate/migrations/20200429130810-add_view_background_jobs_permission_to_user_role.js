const { ROLES } = require('../../lib/access/access-config');

const wsViewOwnJobsStatusPermission = 'wsViewOwnJobsStatus';

exports.up = async function (db) {
  return db
    .collection('roles')
    .updateOne({ name: ROLES.User }, { $addToSet: { permissions: wsViewOwnJobsStatusPermission } });
};

exports.down = function (db) {
  return db
    .collection('roles')
    .updateOne({ name: ROLES.User }, { $pull: { permissions: wsViewOwnJobsStatusPermission } });
};
