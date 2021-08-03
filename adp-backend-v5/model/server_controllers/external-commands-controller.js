const _ = require('lodash');
const Promise = require('bluebird');
const log = require('log4js').getLogger('external-commands-controller');

const {
  runExternalCommand,
  createExternalCommandQueue,
  EXTERNAL_COMMANDS_QUEUE_NAME,
} = require('../../lib/queue/background-jobs/external-commands');
const { getCreator } = require('../../lib/queue/background-jobs/util');
const { handleGraphQlError } = require('../../lib/graphql/util');
const { isValidTimeZone } = require('../../lib/util/date');

const scheduledJobsModelName = 'scheduledJobs';
const commandsCollectionName = 'bjrExternalCommands';

module.exports = () => {
  const m = {};

  m.init = async (appLib) => {
    if (!appLib.queue.isReady()) {
      log.warn(`External commands runner is disabled due to required Bull queue is disabled`);
      return;
    }
    m.appLib = appLib;
    m.externalCommandQueue = await createExternalCommandQueue({ appLib, log });
    appLib.addRoute('get', `/runExternalCommand/:commandId`, [appLib.isAuthenticated, m.runExternalCommand]);

    // await syncMongoScheduledJobsWithQueue();

    wrapBjrExternalCommands();

    // since scheduled jobs are based on external commands and dependant on externalCommandQueue it's handling is here
    wrapScheduledJobs();
  };

  m.runExternalCommand = async (req, res) => {
    const commandId = _.get(req, 'params.commandId');
    const { user } = req;
    const creator = getCreator(m.appLib, user);

    const { success, message, data } = await runExternalCommand({ commandId, creator, appLib: m.appLib, log });
    return res.json({ success, message, data });
  };

  // eslint-disable-next-line no-unused-vars
  async function syncMongoScheduledJobsWithQueue() {
    const scheduledJobs = await m.externalCommandQueue.getRepeatableJobs();
    const existingScheduledJobKeys = new Set(scheduledJobs.map((rj) => rj.key));

    const conditionForActualRecord = m.appLib.dba.getConditionForActualRecord(scheduledJobsModelName);
    const scheduledJobsCursor = m.appLib.db.collection(scheduledJobsModelName).find(conditionForActualRecord);
    for await (const record of scheduledJobsCursor) {
      const { scheduledJobKey } = record;
      if (scheduledJobKey && !existingScheduledJobKeys.has(scheduledJobKey)) {
        // Jobs with 'limit' field are executed limited amount of time.
        // And there is a 'count' field in job opts indicating current iteration,
        // but currently we do not sync 'count' field on every job execution with mongo record.
        // This is why scheduled jobs with 'limit' are skipped.
        const hasLimit = !!_.get(record, 'repeat.limit');
        if (hasLimit) {
          return;
        }

        await addQueueScheduledJob(record);
        // scheduledJobId will be updated
        await updateScheduledJobFields(record);
      }
    }
  }

  function wrapBjrExternalCommands() {
    const { getUpdateOneMutationName, wrapMutation } = m.appLib.graphQl;
    wrapMutation(getUpdateOneMutationName(commandsCollectionName), (next) => async (rp) => {
      try {
        const recordIdToUpdate = rp.args.filter._id;
        const { record: prevRecord } = await m.appLib.db
          .collection(commandsCollectionName)
          .hookQuery('findOne', { _id: recordIdToUpdate }, {});
        const updatedRecord = await next(rp);

        if (prevRecord.command === updatedRecord.command) {
          return;
        }

        // recreate scheduled job on command change
        const currentCommandId = updatedRecord._id;
        const conditionForActualRecord = m.appLib.dba.getConditionForActualRecord(scheduledJobsModelName);
        const scheduledJobsUsingCurrentCommand = await m.appLib.db
          .collection(scheduledJobsModelName)
          .find({ 'command._id': currentCommandId, ...conditionForActualRecord })
          .toArray();

        await Promise.map(
          scheduledJobsUsingCurrentCommand,
          async (scheduledJob) => {
            await removeQueueScheduledJob(scheduledJob);
            await addQueueScheduledJob(scheduledJob);
            await updateScheduledJobFields(scheduledJob);
          },
          { concurrency: 10 }
        );
      } catch (e) {
        handleGraphQlError({
          e,
          message: `Unable to update record`,
          log,
          appLib: m.appLib,
          modelName: commandsCollectionName,
        });
      }
    });
  }

  function wrapScheduledJobs() {
    const { getUpdateOneMutationName, getDeleteMutationName, getCreateMutationName, wrapMutation } = m.appLib.graphQl;

    wrapMutation(getCreateMutationName(scheduledJobsModelName), (next) => async (rp) => {
      try {
        const createdRecord = await next(rp);
        if (createdRecord.isActive === true) {
          await addQueueScheduledJob(createdRecord);
          await updateScheduledJobFields(createdRecord);
        }

        return createdRecord;
      } catch (e) {
        handleGraphQlError({
          e,
          message: `Unable to create record`,
          log,
          appLib: m.appLib,
          modelName: scheduledJobsModelName,
        });
      }
    });

    wrapMutation(getUpdateOneMutationName(scheduledJobsModelName), (next) => async (rp) => {
      try {
        const recordIdToUpdate = rp.args.filter._id;
        const { record: prevRecord } = await m.appLib.db
          .collection(scheduledJobsModelName)
          .hookQuery('findOne', { _id: recordIdToUpdate }, {});

        const updatedRecord = await next(rp);

        const jobFields = ['command', 'progressRegex', 'logRegex', 'repeat'];
        const prevJobFields = _.pick(prevRecord, jobFields);
        const updatedJobFields = _.pick(updatedRecord, jobFields);
        const isJobSpecChanged = !_.isEqual(prevJobFields, updatedJobFields);
        const isDelayedJobExist = !!(await getDelayedJob(prevRecord));

        const isPrevJobShouldBeDeleted = prevRecord.isActive && (isJobSpecChanged || !updatedRecord.isActive);
        const isNewJobShouldBeCreated =
          updatedRecord.isActive && (isJobSpecChanged || !prevRecord.isActive || !isDelayedJobExist);

        // scheduledJobKey and scheduledJobId should not be manually changed by user
        updatedRecord.scheduledJobKey = prevRecord.scheduledJobKey;
        updatedRecord.scheduledJobId = prevRecord.scheduledJobId;

        if (isPrevJobShouldBeDeleted) {
          await removeQueueScheduledJob(updatedRecord);
        }

        if (isNewJobShouldBeCreated) {
          await addQueueScheduledJob(updatedRecord);
        }

        if (isPrevJobShouldBeDeleted || isNewJobShouldBeCreated) {
          await updateScheduledJobFields(updatedRecord);
        }

        return updatedRecord;
      } catch (e) {
        handleGraphQlError({
          e,
          message: `Unable to update record`,
          log,
          appLib: m.appLib,
          modelName: scheduledJobsModelName,
        });
      }
    });

    wrapMutation(getDeleteMutationName(scheduledJobsModelName), (next) => async (rp) => {
      try {
        const result = await next(rp);
        const { deletedRecord } = rp.context;
        await removeQueueScheduledJob(deletedRecord);

        return result;
      } catch (e) {
        handleGraphQlError({
          e,
          message: `Unable to delete record`,
          log,
          appLib: m.appLib,
          modelName: scheduledJobsModelName,
        });
      }
    });
  }

  // bull function from 'bull/lib/repeatable.js'
  function originalGetRepeatKey(name, repeat, jobId) {
    const endDate = repeat.endDate ? `${new Date(repeat.endDate).getTime()}:` : ':';
    const tz = repeat.tz ? `${repeat.tz}:` : ':';
    const suffix = repeat.cron ? tz + repeat.cron : String(repeat.every);

    return `${name}:${jobId}${endDate}${suffix}`;
  }

  function getScheduledJobKeyByAddedScheduledJob(addedScheduledJob) {
    const { name, opts } = addedScheduledJob;
    const { repeat, jobId } = opts;
    // jobId definition is also retrieved from 'bull/lib/scheduled.js'
    const _jobId = jobId ? `${jobId}:` : ':';
    return originalGetRepeatKey(name, repeat, _jobId);
  }

  function updateScheduledJobFields(scheduledJobRecord) {
    const { _id, scheduledJobKey = null, scheduledJobId = null } = scheduledJobRecord;
    return m.appLib.db.collection(scheduledJobsModelName).hookQuery(
      'updateOne',
      { _id },
      {
        $set: {
          scheduledJobKey,
          scheduledJobId,
        },
      }
    );
  }

  function getTimezone(timezoneDefinition) {
    if (_.isString(timezoneDefinition)) {
      return isValidTimeZone(timezoneDefinition) ? timezoneDefinition : null;
    }

    if (!_.isPlainObject(timezoneDefinition)) {
      return null;
    }

    const { isServer, value } = timezoneDefinition;
    if (isServer) {
      const serverTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return serverTimeZone;
    }
    if (isValidTimeZone(value)) {
      return value;
    }
    return null;
  }

  function getTransformedRepeatOpts(jobType, repeatOpts) {
    if (jobType === 'cron') {
      return _.pick(repeatOpts, ['cron', 'tz', 'startDate', 'endDate', 'limit', 'count']);
    }

    if (jobType === 'repeat') {
      return _.pick(repeatOpts, ['every', 'limit', 'count', 'endDate']);
    }

    if (jobType === 'delayed') {
      return {
        cron: '* * * * *',
        tz: repeatOpts.tz,
        startDate: repeatOpts.startDate,
        limit: 1,
      };
    }
  }

  async function addQueueScheduledJob(scheduledJobRecord) {
    const timezone = getTimezone(_.get(scheduledJobRecord, 'repeat.tz'));
    _.set(scheduledJobRecord, 'repeat.tz', timezone);

    const { type: jobType, name, command: commandLookup, repeat, creator } = scheduledJobRecord;
    const { getLookupDoc } = m.appLib.backgroundJobs.util;
    const commandDoc = await getLookupDoc(m.appLib, commandLookup);
    const { _id, logRegex, type, progressRegex, command, backendCommand } = commandDoc;
    const scheduledJob = await m.externalCommandQueue.add(
      {
        creator,
        commandId: _id,
        name,
        type,
        command,
        backendCommand,
        progressRegex,
        logRegex,
        timezone,
      },
      { repeat: getTransformedRepeatOpts(jobType, repeat) }
    );
    const scheduledJobKey = getScheduledJobKeyByAddedScheduledJob(scheduledJob);
    const scheduledJobId = scheduledJob.id;

    scheduledJobRecord.scheduledJobKey = scheduledJobKey;
    scheduledJobRecord.scheduledJobId = scheduledJobId;
  }

  async function removeQueueScheduledJob(scheduledJobRecord) {
    const { scheduledJobKey, scheduledJobId } = scheduledJobRecord;
    if (scheduledJobKey && scheduledJobId) {
      await m.appLib.queue.removeScheduledJob({
        queueName: EXTERNAL_COMMANDS_QUEUE_NAME,
        jobKey: scheduledJobKey,
        jobId: scheduledJobId,
      });
    }

    delete scheduledJobRecord.scheduledJobKey;
    delete scheduledJobRecord.scheduledJobId;
  }

  async function getDelayedJob(scheduledJobRecord) {
    const { scheduledJobId } = scheduledJobRecord;
    if (!scheduledJobId) {
      return null;
    }
    return m.appLib.queue.getDelayedJob({
      queueName: EXTERNAL_COMMANDS_QUEUE_NAME,
      jobId: scheduledJobId,
    });
  }

  return m;
};
