const { ObjectID } = require('mongodb');
const { prepareJavaInstance } = require('../dmn');

const BPMN_QUEUE_NAME = 'bpmnRunner';
const bpmnProcessesCollectionName = 'bpmnProcesses';

async function createBpmnQueue({ appLib, log }) {
  await prepareJavaInstance();

  const { processorContext, util } = appLib.backgroundJobs;
  const bpmnContext = processorContext.getOrCreateContext('bpmnContext');
  bpmnContext.setCommonContext({ db: appLib.db, cache: appLib.cache, log, backgroundJobsUtil: util });

  const bpmnRunnerQueue = appLib.queue.createQueue(BPMN_QUEUE_NAME);
  util.addQueueEventHandlers({ appLib, bullQueue: bpmnRunnerQueue, log });

  bpmnRunnerQueue.process(appLib.config.BPMN_RUNNER_CONCURRENCY, require('./bpmn-queue-processor')(bpmnContext));

  return bpmnRunnerQueue;
}

async function runBpmnProcess({
  _id,
  creator,
  appLib,
  log,
  inputDataMapping,
  parameters,
  inputCollectionName,
  inputRecordsCount,
  outputCollection,
  outputPrefix,
}) {
  try {
    const bpmnRunnerQueue = appLib.queue.getQueue(BPMN_QUEUE_NAME);
    const { record } = await appLib.db
      .collection(bpmnProcessesCollectionName)
      .hookQuery('findOne', { _id: ObjectID(_id) });
    const { xml } = record.definition || {};
    if (!xml) {
      return {
        success: false,
        message: `Please fill-in your BPMN xml definition.`,
      };
    }

    const job = await bpmnRunnerQueue.add({
      xml,
      batchSize: appLib.config.BPMN_BATCH_SIZE,
      creator,
      processRunId: new Date().toISOString(),
      parameters,
      inputDataMapping,
      inputCollectionName,
      inputRecordsCount,
      outputCollection,
      outputPrefix,
    });

    log.info(`Added a job with id '${job.id}' for bpmnProcessId '${_id}'`);
    return {
      success: true,
      data: { queueName: BPMN_QUEUE_NAME, jobId: job.id, _id },
    };
  } catch (error) {
    const defaultMessage = `Unable to add a job for bpmnProcessId '${_id}'.`;
    return appLib.backgroundJobs.util.handleJobError({ error, log, defaultMessage });
  }
}

module.exports = {
  createBpmnQueue,
  runBpmnProcess,
  bpmnProcessesCollectionName,
};
