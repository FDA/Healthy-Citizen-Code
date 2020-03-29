const Promise = require('bluebird');
const fs = require('fs-extra');
const { ValidationError } = require('../errors');

// (for JAVA_DMN_UTIL_CLASS_NAME='com.conceptant.dmn.DmnUtil')
// Jar should contain 'DmnUtil' class in package 'com.conceptant.dmn' with 'DmnUtil(String xml, String decisionKey)' constructor
// and (for JAVA_PROCESS_METHOD_NAME='process') a method 'process(String variablesListJson)'
const JAVA_DMN_UTIL_CLASS_NAME = 'com.conceptant.dmn.DmnUtil';
const JAVA_PROCESS_METHOD_NAME = 'process';

// seems like it's only one java instance allowed per node process
// tests drop with creating multiple instances throwing 'Cannot set asyncOptions after calling any other java function.' error
let java;

async function initJavaInstance(dependenciesDir) {
  if (java) {
    return java;
  }

  java = require('java');
  java.asyncOptions = {
    asyncSuffix: undefined, // Don't generate node-style methods taking callbacks
    syncSuffix: '', // Sync methods use the base name(!!)
    promiseSuffix: 'Promise', // Generate methods returning promises, using the suffix Promise.
    promisify: Promise.promisify, // Needs Node.js version 8 or greater, see comment below
    ifReadOnlySuffix: '_alt',
  };

  const depDirFullPath = require('path').resolve(__dirname, dependenciesDir);
  const dependencies = await fs.readdir(depDirFullPath);

  dependencies.forEach(function(dependency) {
    java.classpath.push(`${depDirFullPath}/${dependency}`);
  });

  await java.ensureJvm();
  return java;
}

async function getDmnUtilInstance(dmnXml, decisionId) {
  return java.newInstancePromise(JAVA_DMN_UTIL_CLASS_NAME, dmnXml, decisionId);
}

async function getValidatedDmnUtilInstance(dmnXml, decisionId) {
  const dmnUtilInstance = await getDmnUtilInstance(dmnXml, decisionId);
  const error = await dmnUtilInstance.isValidPromise();
  if (error) {
    throw new ValidationError(error);
  }
  return dmnUtilInstance;
}

async function processDmnVariables(dmnUtilInstance, variables) {
  const stringifiedVariables = JSON.stringify(variables);
  const result = await dmnUtilInstance[`${JAVA_PROCESS_METHOD_NAME}Promise`](stringifiedVariables);
  return JSON.parse(result);
}

async function getUserIdsToNotify(appLib, jobCreatorId) {
  const [jobCreatorAllowedToSeeJobStatus, viewAllJobsUserIds] = await Promise.all([
    isJobCreatorAllowedToSeeJobStatus(jobCreatorId),
    getUsersWithPermissions(['wsViewAllJobsStatus']),
  ]);
  if (jobCreatorAllowedToSeeJobStatus) {
    viewAllJobsUserIds.push(jobCreatorId);
    return [...new Set(viewAllJobsUserIds)];
  }
  return viewAllJobsUserIds;

  async function getUsersWithPermissions(permissions) {
    const roleNames = [appLib.accessCfg.ROLES.SuperAdmin];
    if (permissions.includes(appLib.accessCfg.PERMISSIONS.accessAsUser)) {
      // since accessAsUser permission is autogranted it is not in user.roles
      roleNames.push(appLib.accessCfg.ROLES.User);
    }

    const getPromise = async () => {
      const result = await appLib.db
        .model('roles')
        .aggregate([
          { $match: { $or: [{ permissions: { $in: permissions } }, { name: { $in: roleNames } }] } },
          {
            $group: {
              _id: null,
              roleIds: { $addToSet: '$_id' },
            },
          },
          {
            $lookup: {
              from: 'users',
              as: 'users',
              let: { roleIds: '$roleIds' },
              pipeline: [
                {
                  $addFields: {
                    rolesIntersection: {
                      $setIntersection: [
                        '$$roleIds',
                        {
                          $map: {
                            input: '$roles',
                            as: 'role',
                            in: '$$role._id',
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  $match: {
                    rolesIntersection: { $not: { $size: 0 } },
                  },
                },
                {
                  $project: {
                    _id: 1,
                  },
                },
              ],
            },
          },
          { $project: { _id: 0, users: 1 } },
        ])
        .exec();
      return result[0].users.map(u => u._id.toString());
    };

    const key = appLib.cache.keys.usersWithStatuses(permissions);
    return appLib.cache.getUsingCache(getPromise, key);
  }

  async function isJobCreatorAllowedToSeeJobStatus(creatorId) {
    const user = await appLib.db.model('users').findOne({ _id: creatorId });
    if (!user) {
      return false;
    }

    const userRoleIds = user.roles.map(r => r._id);
    const roles = await appLib.db
      .model('roles')
      .find({ $and: [{ _id: { $in: userRoleIds } }, { permissions: 'wsViewOwnJobsStatus' }] })
      .exec();

    const isAllowed = roles.length;
    return isAllowed;
  }
}

async function emitBackgroundJobEvent(appLib, { creatorId, level, message, data }) {
  const userIds = await getUserIdsToNotify(appLib, creatorId);
  appLib.ws.sendRequest('emitToSockets', {
    data: {
      type: 'backgroundJobs',
      level: level || 'info',
      message,
      data,
    },
    socketFilter: `return this.userIds.includes(socket.userId);`,
    context: { userIds },
  });
}

module.exports = {
  initJavaInstance,
  processDmnVariables,
  getValidatedDmnUtilInstance,
  getUserIdsToNotify,
  emitBackgroundJobEvent,
};
