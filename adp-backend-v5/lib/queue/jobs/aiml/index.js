const { ObjectID } = require('mongodb');

const { addLogsAndNotificationsForQueueEvents } = require('../../../util/backgroundJobs');
const { getOrCreateContext } = require('../processor-context');
const { handleJobError } = require('../util');

const processorContext = getOrCreateContext('aimlContext');
const { setCommonContext } = processorContext;

const AIML_QUEUE_NAME = 'aimlRunner';
const aimlRunnerConcurrency = +process.env.AIML_RUNNER_CONCURRENCY || 1;
const aimlConcurrentRequestNumber = +process.env.AIML_CONCURRENT_REQEUST_NUMBER || 5;
const aimlModelsCollectionName = 'aimlModels';

async function createAimlQueue({ appLib, log }) {
  setCommonContext({ db: appLib.db, cache: appLib.cache, log });

  const aimlRunnerQueue = appLib.queue.createQueue(AIML_QUEUE_NAME);
  addLogsAndNotificationsForQueueEvents(appLib, aimlRunnerQueue, log);

  aimlRunnerQueue.process(aimlRunnerConcurrency, require('./aiml-queue-processor')(processorContext));

  return aimlRunnerQueue;
}

async function runAimlModel({
  _id,
  creator,
  appLib,
  log,
  inputDataMapping,
  outputDataMapping,
  parameters,
  inputCollectionName,
  inputRecordsCount,
  outputCollection,
  outputPrefix,
}) {
  try {
    const aimlRunnerQueue = appLib.queue.getQueue(AIML_QUEUE_NAME);
    const record = await appLib.db.collection(aimlModelsCollectionName).findOne({ _id: ObjectID(_id) });
    const { endpoint } = record || {};
    if (!endpoint) {
      return {
        success: false,
        message: `Please fill-in 'endpoint' field for specified AIML record.`,
      };
    }

    const job = await aimlRunnerQueue.add({
      _id,
      endpoint,
      concurrentRequestNumber: aimlConcurrentRequestNumber,
      creator,
      aimlRunId: new Date().toISOString(),
      parameters,
      inputDataMapping,
      outputDataMapping,
      inputCollectionName,
      inputRecordsCount,
      outputCollection,
      outputPrefix,
    });

    log.info(`Added a job with id '${job.id}' for aimlId '${_id}'`);
    return {
      success: true,
      data: { queueName: AIML_QUEUE_NAME, jobId: job.id, aimlId: _id },
    };
  } catch (error) {
    const defaultMessage = `Unable to add a job for aimlId '${_id}'.`;
    return handleJobError({ error, log, defaultMessage });
  }
}

module.exports = {
  createAimlQueue,
  runAimlModel,
  aimlModelsCollectionName,
};
