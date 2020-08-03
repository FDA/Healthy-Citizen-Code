const _ = require('lodash');
const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const { initJavaInstance, getValidatedDmnUtilInstance } = require('./dmn-util');

const dmnContextName = 'dmnContext';
const DMN_QUEUE_NAME = 'dmnRunner';
const dmnBatchSize = +process.env.DMN_BATCH_SIZE || 10000;
const dmnRunnerConcurrency = +process.env.DMN_RUNNER_CONCURRENCY || 1;
const ruleCollectionName = 'businessRules';

function prepareJavaInstance() {
  const depDirFullPath = require('path').resolve(__dirname, './dependency');
  return initJavaInstance(depDirFullPath);
}

async function createDmnQueue({ appLib, log }) {
  await prepareJavaInstance();

  const { processorContext, util } = appLib.backgroundJobs;
  const dmnContext = processorContext.getOrCreateContext(dmnContextName);
  dmnContext.setCommonContext({ db: appLib.db, cache: appLib.cache, log, backgroundJobsUtil: util });

  const dmnRunnerQueue = appLib.queue.createQueue(DMN_QUEUE_NAME);
  util.addLogsAndNotificationsForQueueEvents(appLib, dmnRunnerQueue, log);

  dmnRunnerQueue.process(dmnRunnerConcurrency, require('./dmn-queue-processor')(dmnContext));

  return dmnRunnerQueue;
}

async function runDmnRule({
  _id,
  appLib,
  creator,
  log,
  inputDataMapping,
  parameters,
  outputDataMapping,
  inputRecordsCount,
  inputCollectionName,
  outputCollection,
  outputPrefix,
}) {
  try {
    const dmnRunnerQueue = appLib.queue.getQueue(DMN_QUEUE_NAME);
    const rule = await appLib.db.collection(ruleCollectionName).findOne({ _id: ObjectID(_id) });
    const { dmnXml, decisionId } = _.get(rule, 'definition', {});
    if (!dmnXml || !decisionId) {
      return {
        success: false,
        message: `Please fill-in your DMN xml and main decision.`,
      };
    }

    const { dmnUtilInstance, error } = await getValidatedDmnUtilInstance(dmnXml, decisionId);
    if (error) {
      throw new appLib.errors.ValidationError(error);
    }
    const ruleRunId = new Date().toISOString();

    const jobContextId = uuidv4();
    const { processorContext } = appLib.backgroundJobs;
    const dmnContext = processorContext.getOrCreateContext(dmnContextName);
    dmnContext.set(jobContextId, { dmnUtilInstance });

    const job = await dmnRunnerQueue.add({
      jobContextId,
      creator,
      batchSize: dmnBatchSize,
      inputRecordsCount,
      inputCollectionName,
      ruleRunId,
      outputCollection,
      outputPrefix,
      parameters,
      inputDataMapping,
      outputDataMapping,
    });

    log.info(`Added a job with id '${job.id}' for ruleId '${_id}', ruleRunId '${ruleRunId}'`);
    return {
      success: true,
      data: { queueName: DMN_QUEUE_NAME, jobId: job.id, ruleId: _id, ruleRunId },
    };
  } catch (error) {
    const defaultMessage = `Unable to add a job for ruleId '${_id}'.`;
    return appLib.backgroundJobs.util.handleJobError({ error, log, defaultMessage });
  }
}

module.exports = {
  prepareJavaInstance,
  runDmnRule,
  createDmnQueue,
  ruleCollectionName,
};
