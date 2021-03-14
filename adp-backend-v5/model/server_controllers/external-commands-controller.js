const _ = require('lodash');
const log = require('log4js').getLogger('external-commands-controller');

const {
  runExternalCommand,
  createExternalCommandQueue,
  EXTERNAL_COMMANDS_QUEUE_NAME,
} = require('../../lib/queue/background-jobs/external-commands');
const { getCreator } = require('../../lib/queue/background-jobs/util');
const { handleGraphQlError } = require('../../lib/graphql/util');

const scheduledJobsModelName = 'scheduledJobs';

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

  function wrapScheduledJobs() {
    const { getUpdateOneMutationName, getDeleteMutationName, getCreateMutationName, wrapMutation } = m.appLib.graphQl;

    wrapMutation(getCreateMutationName(scheduledJobsModelName), (next) => async (rp) => {
      try {
        const createdRecord = await next(rp);
        if (createdRecord.isActive === true) {
          await addQueueScheduledJob(createdRecord);
        }

        return createdRecord;
      } catch (e) {
        handleGraphQlError(e, `Unable to create record`, log, m.appLib);
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

        const isPrevJobShouldBeDeleted =
          prevRecord.isActive && ((!isJobSpecChanged && !updatedRecord.isActive) || isJobSpecChanged);
        const isNewJobShouldBeCreated =
          updatedRecord.isActive && ((!isJobSpecChanged && !prevRecord.isActive) || isJobSpecChanged);

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
        handleGraphQlError(e, `Unable to update record`, log, m.appLib);
      }
    });

    wrapMutation(getDeleteMutationName(scheduledJobsModelName), (next) => async (rp) => {
      try {
        const result = await next(rp);
        const { deletedRecord } = rp.context;
        if (deletedRecord.isActive) {
          await removeQueueScheduledJob(deletedRecord);
        }

        return result;
      } catch (e) {
        handleGraphQlError(e, `Unable to delete record`, log, m.appLib);
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
    const { type: jobType, name, command: commandLookup, repeat, creator } = scheduledJobRecord;

    const { getLookupDoc } = m.appLib.backgroundJobs.util;
    const commandDoc = await getLookupDoc(m.appLib, commandLookup);
    const { _id, logRegex, progressRegex, command } = commandDoc;
    const scheduledJob = await m.externalCommandQueue.add(
      {
        creator,
        name,
        commandId: _id,
        command,
        progressRegex,
        logRegex,
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

  return m;
};
