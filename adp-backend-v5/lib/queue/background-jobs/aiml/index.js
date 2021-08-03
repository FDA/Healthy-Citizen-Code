const { ObjectID } = require('mongodb');

const AIML_QUEUE_NAME = 'aimlRunner';
const aimlModelsCollectionName = 'aimlModels';

async function createAimlQueue({ appLib, log }) {
  const { processorContext, util } = appLib.backgroundJobs;
  const aimlContext = processorContext.getOrCreateContext('aimlContext');
  aimlContext.setCommonContext({ db: appLib.db, cache: appLib.cache, log, backgroundJobsUtil: util });

  const aimlRunnerQueue = appLib.queue.createQueue(AIML_QUEUE_NAME);
  util.addQueueEventHandlers({ appLib, bullQueue: aimlRunnerQueue, log });

  aimlRunnerQueue.process(appLib.config.AIML_RUNNER_CONCURRENCY, require('./aiml-queue-processor')(aimlContext));

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
    const { record } = await appLib.db
      .collection(aimlModelsCollectionName)
      .hookQuery('findOne', { _id: ObjectID(_id) });
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
      concurrentRequestNumber: appLib.config.AIML_CONCURRENT_REQUEST_NUMBER,
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
    return appLib.backgroundJobs.util.handleJobError({ error, log, defaultMessage });
  }
}

module.exports = {
  createAimlQueue,
  runAimlModel,
  aimlModelsCollectionName,
};
