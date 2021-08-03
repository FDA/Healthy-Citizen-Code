const _ = require('lodash');
const { EJSON } = require('bson');

const { getOrCreateContext } = require('../../processor-context');
const { handleJobError, emitBackgroundJobEvent } = require('../../util');
const { ValidationError } = require('../../../../errors');

const processorContext = getOrCreateContext('exportDataToDbContext');
const { setCommonContext } = processorContext;

const EXPORT_DATA_TO_DB_QUEUE_NAME = 'exportDataToDbRunner';
const exportDataToDbConcurrency = +process.env.EXPORT_DATA_TO_DB_RUNNER_CONCURRENCY || 5;

async function emitMessage(appLib, { creatorId, level, message, data }) {
  return emitBackgroundJobEvent(appLib, { type: 'exportDataToDb', creatorId, level, message, data });
}

function addQueueEventHandlers({ appLib, bullQueue, log }) {
  log = log || { info: _.noop, error: _.noop, warn: _.noop };

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

      const { datasetId, datasetName } = job.data;
      emitMessage(appLib, {
        creatorId: job.data.creator._id,
        level: 'info',
        message: `Export '${datasetName}' successfully completed`,
        data: { jobId: job.id, queueName, datasetId, datasetName, status: 'completed' },
      });
    })
    .on('failed', async (job, error) => {
      const queueName = job.queue.name;
      log.error(`Error occurred in queue '${queueName}', job id ${job.id}.`, error.stack);
      const { datasetId, datasetName } = job.data;
      const baseMessage = `Error occurred while exporting '${datasetName}'`;
      const message = error instanceof ValidationError ? `${baseMessage}. ${error.message}` : baseMessage;
      emitMessage(appLib, {
        creatorId: job.data.creator._id,
        level: 'error',
        message,
        data: { jobId: job.id, queueName, datasetId, datasetName, status: 'error' },
      });
    })
    .on('stalled', (job) => {
      const queueName = job.queue.name;
      log.warn(`'${queueName}' Job with id ${job.id} is stalled`);
      emitMessage(appLib, {
        creatorId: job.data.creator._id,
        level: 'warning',
        message: `Export ${job.data.datasetName} has stalled`,
        data: { jobId: job.id, queueName, status: 'stall' },
      });
    })
    .on('active', (job) => {
      const queueName = job.queue.name;
      log.info(`'${queueName}' Job with id ${job.id} has started`);
      const { datasetId, datasetName } = job.data;
      emitMessage(appLib, {
        creatorId: job.data.creator._id,
        level: 'info',
        message: `Export '${datasetName}' has started`,
        data: { jobId: job.id, queueName, datasetId, datasetName, status: 'start' },
      });
    });
}

async function createExportDataToDbQueue({ appLib, log }) {
  setCommonContext({ appLib, log });

  const exportDataToDbRunnerQueue = appLib.queue.createQueue(EXPORT_DATA_TO_DB_QUEUE_NAME);
  addQueueEventHandlers({ appLib, bullQueue: exportDataToDbRunnerQueue, log });

  exportDataToDbRunnerQueue.process(
    exportDataToDbConcurrency,
    require('./export-data-to-db-processor')(processorContext)
  );

  return exportDataToDbRunnerQueue;
}

async function runExportDataToDb({
  datasetId,
  datasetName,
  outCollectionName,
  parentCollectionName,
  outputPipeline,
  creator,
  appLib,
  exportRecordId,
  log,
}) {
  try {
    const exportDataToDbQueue = appLib.queue.getQueue(EXPORT_DATA_TO_DB_QUEUE_NAME);
    const job = await exportDataToDbQueue.add({
      datasetId,
      datasetName,
      outCollectionName,
      parentCollectionName,
      outputPipeline: EJSON.stringify(outputPipeline),
      exportRecordId,
      creator,
    });
    return {
      success: true,
      data: { queueName: EXPORT_DATA_TO_DB_QUEUE_NAME, jobId: job.id },
    };
  } catch (error) {
    const defaultMessage = `Unable to export data'`;
    return handleJobError({ error, log, defaultMessage });
  }
}

module.exports = {
  createExportDataToDbQueue,
  runExportDataToDb,
  EXPORT_DATA_TO_DB_QUEUE_NAME,
};
