const _ = require('lodash');
const Promise = require('bluebird');
const { ObjectID } = require('mongodb');
const { getDocValueForExpression } = require('../../util/util');
const { getFunction } = require('../../util/memoize');
const { ValidationError } = require('../../errors');
const { PERMISSIONS } = require('../../access/access-config');

function getCreator(appLib, user) {
  const userLabel = _.get(appLib.appModel.models.backgroundJobs, 'creator.lookup.table.users.label');
  const creatorId = user._id;
  return {
    _id: creatorId, // it's passed as string to redis job
    table: 'users',
    label: userLabel ? getDocValueForExpression(user, userLabel) : user.login,
  };
}

function flattenObject(obj, prefix = '', delimiter = '_') {
  if (!obj) {
    return {};
  }

  const result = {};
  _.each(obj, (val, key) => {
    key = prefix ? `${prefix}${delimiter}${key}` : key;
    if (_.isObject(val)) {
      const flatObject = flattenObject(val, null, delimiter);
      _.each(flatObject, (nestedObjVal, nestedObjKey) => {
        result[`${key}${delimiter}${nestedObjKey}`] = nestedObjVal;
      });
    } else {
      result[key] = val;
    }
  });
  return result;
}

function handleJobError({ error, defaultMessage, log }) {
  if (error instanceof ValidationError) {
    log.error(defaultMessage, error.message);
    return { success: false, message: error.message };
  }

  log.error(defaultMessage, error.stack);
  return { success: false, message: defaultMessage };
}

function getPercentage(processedCount, overallCount) {
  const ratio = Math.floor((processedCount / overallCount) * 100) / 100;
  return ratio * 100;
}

function processDataMapping({ input, dataMapping, response }) {
  const context = { input, response };

  const fieldsMapping = _.get(dataMapping, 'fieldsMapping', []);
  const basicMapping = {};
  _.each(fieldsMapping, (fieldMapping) => {
    const { inputFieldName, outputFieldName } = fieldMapping;
    basicMapping[inputFieldName] = outputFieldName;
  });
  context.basicMapping = basicMapping;

  let output;
  if (!_.isPlainObject(input) || _.isEmpty(context.basicMapping)) {
    output = input;
  } else {
    output = {};
    _.each(context.basicMapping, (outputFieldName, inputFieldName) => {
      const inputValue = _.get(input, inputFieldName);
      _.set(output, outputFieldName, inputValue);
    });
  }
  context.output = output;

  const postProcessingCode = _.get(dataMapping, 'postProcessingCode');
  if (!postProcessingCode) {
    return output;
  }
  const values = [flattenObject, _, ObjectID];
  return getFunction(`flattenObject, _, ObjectID`, postProcessingCode).apply(context, values);
}

function getSchemeFieldsByOutputs(outputs, prefix = '', delimiter = '_') {
  const fields = {};

  _.each(outputs, ({ name, type }) => {
    let fieldType;
    if (type === 'number') {
      fieldType = 'Number';
    } else if (type === 'string') {
      fieldType = 'String';
    } else if (type === 'boolean') {
      fieldType = 'Boolean';
    }

    if (fieldType) {
      const fieldName = prefix ? `${prefix}${delimiter}${name}` : name;
      const { accessAsAnyone } = PERMISSIONS;
      fields[fieldName] = {
        type: fieldType,
        fieldName,
        filter: fieldType.toLowerCase(),
        showInDatatable: true,
        showInViewDetails: true,
        showInGraphql: true,
        showInColumnChooser: true,
        width: 80,
        permissions: {
          view: accessAsAnyone,
          create: accessAsAnyone,
          update: accessAsAnyone,
          upsert: accessAsAnyone,
        },
      };
    }
  });

  return fields;
}

function upsertResultRecords({ db, collection, resultRecords, $setOnInsert, concurrency = 50 }) {
  return Promise.map(
    resultRecords,
    (resultRecord) => {
      const { _id } = resultRecord;
      return db
        .collection(collection)
        .hookQuery('updateOne', { _id }, { $set: resultRecord, $setOnInsert }, { upsert: true, checkKeys: false });
    },
    { concurrency }
  );
}

async function getLookupDoc(appLib, lookup, projections = {}) {
  if (!_.isPlainObject(lookup)) {
    return null;
  }

  const { _id, table } = lookup;
  if (!_id || !table) {
    return null;
  }
  const { record } = await appLib.db
    .collection(table)
    .hookQuery('findOne', { _id: ObjectID(_id), ...appLib.dba.getConditionForActualRecord(table) }, projections);
  return record;
}

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
        .collection('roles')
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
        .toArray();
      return result[0].users.map((u) => u._id.toString());
    };

    const key = appLib.cache.keys.usersWithPermissions(permissions);
    return appLib.cache.getUsingCache(getPromise, key);
  }

  async function isJobCreatorAllowedToSeeJobStatus(creatorId) {
    const { record: user } = await appLib.db.collection('users').hookQuery('findOne', { _id: creatorId });
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
      .collection('roles')
      .find({ $and: [{ _id: { $in: userRoleIds } }, { permissions: wsViewOwnJobsStatusPermission }] })
      .toArray();

    const isAllowed = !!roles.length;
    return isAllowed;
  }
}

async function emitBackgroundJobEvent(appLib, { type, creatorId, level, message, data }) {
  const userIds = await getUserIdsToNotifyAboutBgJobs(appLib, creatorId);
  appLib.ws.performAction('emitToSockets', {
    data: {
      type: type || 'backgroundJobs',
      level: level || 'info',
      message,
      data,
    },
    socketFilter: `return this.userIds.includes(socket.userId);`,
    context: { userIds },
  });
}

function addQueueEventHandlers({ appLib, bullQueue, log, enableNotifications = false }) {
  log = log || { info: _.noop, error: _.noop, warn: _.noop };
  const emitMessage = enableNotifications ? emitBackgroundJobEvent : _.noop;

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
      emitMessage(appLib, {
        creatorId: job.data.creator._id,
        level: 'info',
        message: `Job with id ${job.id} successfully completed`,
        data: { jobId: job.id, queueName, status: 'completed' },
      });
    })
    .on('failed', async (job, error) => {
      const queueName = job.queue.name;
      log.error(`Error occurred in queue '${queueName}', job id ${job.id}.`, error.stack);
      const baseMessage = `Error occurred for job with id ${job.id}`;
      const message = error instanceof ValidationError ? `${baseMessage}. ${error.message}` : baseMessage;
      emitMessage(appLib, {
        creatorId: job.data.creator._id,
        level: 'error',
        message,
        data: { jobId: job.id, queueName, status: 'error' },
      });
    })
    .on('stalled', (job) => {
      const queueName = job.queue.name;
      log.warn(`'${queueName}' Job with id ${job.id} is stalled`);
      emitMessage(appLib, {
        creatorId: job.data.creator._id,
        level: 'warning',
        message: `Job with id ${job.id} is stalled`,
        data: { jobId: job.id, queueName, status: 'stall' },
      });
    })
    .on('active', (job) => {
      const queueName = job.queue.name;
      log.info(`'${queueName}' Job with id ${job.id} has started`);
      emitMessage(appLib, {
        creatorId: job.data.creator._id,
        level: 'info',
        message: `Job with id ${job.id} has started`,
        data: { jobId: job.id, queueName, status: 'start' },
      });
    });
}

module.exports = {
  getCreator,
  flattenObject,
  handleJobError,
  getPercentage,
  processDataMapping,
  getSchemeFieldsByOutputs,
  upsertResultRecords,
  getLookupDoc,
  getUserIdsToNotifyAboutBgJobs,
  emitBackgroundJobEvent,
  addQueueEventHandlers,
};
