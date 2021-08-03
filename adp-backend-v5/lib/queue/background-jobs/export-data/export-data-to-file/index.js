const _ = require('lodash');
const { ObjectId } = require('mongodb');
const { EJSON } = require('bson');

const { getOrCreateContext } = require('../../processor-context');
const { handleJobError, emitBackgroundJobEvent } = require('../../util');
const { ValidationError } = require('../../../../errors');

const processorContext = getOrCreateContext('exportDataToFileContext');
const { setCommonContext } = processorContext;

const EXPORT_DATA_TO_FILE_QUEUE_NAME = 'exportDataToFileRunner';
const exportDataToFileConcurrency = +process.env.EXPORT_DATA_TO_FILE_RUNNER_CONCURRENCY || 5;

async function emitMessage(appLib, { creatorId, level, message, data }) {
  return emitBackgroundJobEvent(appLib, { type: 'exportDataToFile', creatorId, level, message, data });
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

      const { fileId, exportName } = job.data;
      emitMessage(appLib, {
        creatorId: job.data.creator._id,
        level: 'info',
        message: `Export ${exportName} successfully completed`,
        data: { jobId: job.id, queueName, fileId, exportName, status: 'completed' },
      });
    })
    .on('failed', async (job, error) => {
      const queueName = job.queue.name;
      log.error(`Error occurred in queue '${queueName}', job id ${job.id}.`, error.stack);
      const { fileId, exportName } = job.data;
      const baseMessage = `Error occurred while exporting ${exportName}`;
      const message = error instanceof ValidationError ? `${baseMessage}. ${error.message}` : baseMessage;
      emitMessage(appLib, {
        creatorId: job.data.creator._id,
        level: 'error',
        message,
        data: { jobId: job.id, queueName, fileId, exportName, status: 'error' },
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
      const { fileId, exportName } = job.data;
      emitMessage(appLib, {
        creatorId: job.data.creator._id,
        level: 'info',
        message: `Exporting ${exportName} has started`,
        data: { jobId: job.id, queueName, fileId, exportName, status: 'start' },
      });
    });
}

async function createExportDataToFileQueue({ appLib, log }) {
  setCommonContext({ appLib, log });

  const exportDataToFileRunnerQueue = appLib.queue.createQueue(EXPORT_DATA_TO_FILE_QUEUE_NAME);
  addQueueEventHandlers({ appLib, bullQueue: exportDataToFileRunnerQueue, log });

  exportDataToFileRunnerQueue.process(
    exportDataToFileConcurrency,
    require('./export-data-to-file-processor')(processorContext)
  );

  return exportDataToFileRunnerQueue;
}

const { filesCollectionName } = require('../../../../file/constants');

function getAllowedCollections(models) {
  const restrictedCollections = [filesCollectionName, 'users', 'roles', 'dxGridViews', 'datasets'];
  return Object.keys(models).filter((c) => !restrictedCollections.includes(c));
}

async function runExportDataToFile({
  collectionToExport,
  projections,
  exportName,
  exportPipeline,
  exportType,
  timezone,
  exportRecordId,
  creator,
  appLib,
  log,
}) {
  try {
    const allowedCollections = getAllowedCollections(appLib.appModel.models);
    if (!allowedCollections.includes(collectionToExport)) {
      return {
        success: false,
        message: `Unable to export data for collection '${collectionToExport}'`,
      };
    }

    const fileId = ObjectId();
    const { generateDestinationFilePath, getRelativePath } = appLib.file.util;
    const absoluteFilePath = generateDestinationFilePath({ docId: fileId });
    const relativeFilePath = getRelativePath(absoluteFilePath);

    const exportDataQueue = appLib.queue.getQueue(EXPORT_DATA_TO_FILE_QUEUE_NAME);
    const job = await exportDataQueue.add({
      fileId,
      exportName,
      projections,
      absoluteFilePath,
      relativeFilePath,
      collectionToExport,
      exportPipeline: EJSON.stringify(exportPipeline),
      exportType,
      timezone,
      exportRecordId,
      creator,
    });
    return {
      success: true,
      data: { queueName: EXPORT_DATA_TO_FILE_QUEUE_NAME, jobId: job.id, fileId },
    };
  } catch (error) {
    const defaultMessage = `Unable to export data'`;
    return handleJobError({ error, log, defaultMessage });
  }
}

module.exports = {
  createExportDataToFileQueue,
  runExportDataToFile,
  EXPORT_DATA_TO_FILE_QUEUE_NAME,
};
