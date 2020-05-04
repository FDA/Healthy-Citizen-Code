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
    const user = await appLib.db.model('users').findOne({ _id: creatorId }).lean();
    if (!user) {
      return false;
    }

    const wsViewOwnJobsStatusPermission = 'wsViewOwnJobsStatus';

    // check if default User role(not presented in user.roles in db) contains necessary permission
    const rolesToPermissions = await appLib.cache.getUsingCache(
      () => appLib.accessUtil.getRolesToPermissions(),
      appLib.cache.keys.rolesToPermissions()
    );
    const userPermissions = rolesToPermissions[appLib.accessCfg.ROLES.User];
    if (userPermissions.includes(wsViewOwnJobsStatusPermission)) {
      return true;
    }

    // then check non-default roles
    const userRoleIds = user.roles.map((r) => r._id);
    const roles = await appLib.db
      .model('roles')
      .find({ $and: [{ _id: { $in: userRoleIds } }, { permissions: wsViewOwnJobsStatusPermission }] })
      .exec();

    const isAllowed = !!roles.length;
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
    .on('progress', (job, progress) => {
      const queueName = job.queue.name;
      return log.info(`'${queueName}' Job with id ${job.id} progress is ${progress}`);
    })
    .on('error', (error) => log.error(`Bull error occurred.`, error.stack))
    .on('completed', async (job) => {
      const queueName = job.queue.name;
      const message = `'${queueName}' Job with id ${job.id} successfully completed`;
      log.info(message);
      emitBackgroundJobEvent(appLib, {
        creatorId: job.data.creator._id,
        level: 'info',
        message: `Job with id ${job.id} successfully completed`,
        data: { jobId: job.id, queueName, status: 'completed' },
      });
    })
    .on('failed', async (job, error) => {
      const queueName = job.queue.name;
      log.error(`Error occurred in queue '${queueName}', job id ${job.id}.`, error.stack);
      emitBackgroundJobEvent(appLib, {
        creatorId: job.data.creator._id,
        level: 'error',
        message: `Error occurred for job with id ${job.id}. ${error.message}`,
        data: { jobId: job.id, queueName, status: 'error' },
      });
    })
    .on('stalled', (job) => {
      const queueName = job.queue.name;
      log.warn(`'${queueName}' Job with id ${job.id} is stalled`);
      emitBackgroundJobEvent(appLib, {
        creatorId: job.data.creator._id,
        level: 'warning',
        message: `Job with id ${job.id} is stalled`,
        data: { jobId: job.id, queueName, status: 'stall' },
      });
    })
    .on('active', (job) => {
      const queueName = job.queue.name;
      log.info(`'${queueName}' Job with id ${job.id} has started`);
      emitBackgroundJobEvent(appLib, {
        creatorId: job.data.creator._id,
        level: 'info',
        message: `Job with id ${job.id} has started`,
        data: { jobId: job.id, queueName, status: 'start' },
      });
    });
}

module.exports = {
  getUserIdsToNotifyAboutBgJobs,
  emitBackgroundJobEvent,
  addLogsAndNotificationsForQueueEvents,
};
