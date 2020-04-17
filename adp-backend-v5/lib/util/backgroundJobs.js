async function getUserIdsToNotifyAboutBgJobs(appLib, jobCreatorId) {
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
      return result[0].users.map((u) => u._id.toString());
    };

    const key = appLib.cache.keys.usersWithPermissions(permissions);
    return appLib.cache.getUsingCache(getPromise, key);
  }

  async function isJobCreatorAllowedToSeeJobStatus(creatorId) {
    const user = await appLib.db.model('users').findOne({ _id: creatorId });
    if (!user) {
      return false;
    }

    const userRoleIds = user.roles.map((r) => r._id);
    const roles = await appLib.db
      .model('roles')
      .find({ $and: [{ _id: { $in: userRoleIds } }, { permissions: 'wsViewOwnJobsStatus' }] })
      .exec();

    const isAllowed = roles.length;
    return isAllowed;
  }
}

async function emitBackgroundJobEvent(appLib, { creatorId, level, message, data }) {
  const userIds = await getUserIdsToNotifyAboutBgJobs(appLib, creatorId);
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

function addLogsAndNotificationsForQueueEvents(appLib, bullQueue, log) {
  bullQueue
    .on('progress', (job, progress) => log.info(`Job with id ${job.id} progress is ${progress}`))
    .on('error', (error) => log.error(`Bull error occurred.`, error.stack))
    .on('completed', async (job) => {
      const message = `Job with id ${job.id} successfully completed`;
      log.info(message);
      emitBackgroundJobEvent(appLib, {
        creatorId: job.data.creator._id,
        level: 'info',
        message,
        data: { jobId: job.id },
      });
    })
    .on('failed', async (job, error) => {
      log.error(`Error occurred for job with id ${job.id}.`, error.stack);
      emitBackgroundJobEvent(appLib, {
        creatorId: job.data.creator._id,
        level: 'error',
        message: `Error occurred for job with id ${job.id}. ${error.message}`,
        data: { jobId: job.id },
      });
    })
    .on('stalled', (job) => {
      const message = `Job with id ${job.id} progress is stalled`;
      log.warn(message);
      emitBackgroundJobEvent(appLib, {
        creatorId: job.data.creator._id,
        level: 'warning',
        message,
        data: { jobId: job.id },
      });
    })
    .on('active', (job) => {
      const message = `Job with id ${job.id} has started`;
      log.info(message);
      emitBackgroundJobEvent(appLib, {
        creatorId: job.data.creator._id,
        level: 'info',
        message,
        data: { jobId: job.id },
      });
    });
}

module.exports = {
  getUserIdsToNotifyAboutBgJobs,
  emitBackgroundJobEvent,
  addLogsAndNotificationsForQueueEvents,
};
