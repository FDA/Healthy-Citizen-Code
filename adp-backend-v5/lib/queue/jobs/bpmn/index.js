const { ObjectID } = require('mongodb');

const { addLogsAndNotificationsForQueueEvents } = require('../../../util/backgroundJobs');
const { getOrCreateContext } = require('../processor-context');
const { handleJobError } = require('../util');
const { prepareJavaInstance } = require('../dmn');

const processorContext = getOrCreateContext('bpmnContext');
const { setCommonContext } = processorContext;

const BPMN_QUEUE_NAME = 'bpmnRunner';
const bpmnRunnerConcurrency = +process.env.BPMN_RUNNER_CONCURRENCY || 1;
const bpmnBatchSize = +process.env.BPMN_BATCH_SIZE || 10000;
const bpmnProcessesCollectionName = 'bpmnProcesses';

async function createBpmnQueue({ appLib, log }) {
  await prepareJavaInstance();

  setCommonContext({ db: appLib.db, cache: appLib.cache, log });

  const bpmnRunnerQueue = appLib.queue.createQueue(BPMN_QUEUE_NAME);
  addLogsAndNotificationsForQueueEvents(appLib, bpmnRunnerQueue, log);

  bpmnRunnerQueue.process(bpmnRunnerConcurrency, require('./bpmn-queue-processor')(processorContext));

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
    const record = await appLib.db.collection(bpmnProcessesCollectionName).findOne({ _id: ObjectID(_id) });
    const { xml } = record.definition || {};
    if (!xml) {
      return {
        success: false,
        message: `Please fill-in your BPMN xml definition.`,
      };
    }

    const job = await bpmnRunnerQueue.add({
      xml,
      batchSize: bpmnBatchSize,
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
    return handleJobError({ error, log, defaultMessage });
  }
}

module.exports = {
  createBpmnQueue,
  runBpmnProcess,
  bpmnProcessesCollectionName,
};
