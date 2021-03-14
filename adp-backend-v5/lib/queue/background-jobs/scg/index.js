const _ = require('lodash');

const { getOrCreateContext } = require('../processor-context');
const { handleJobError, addQueueEventHandlers } = require('../util');
const { getSchemaPaths } = require('../../../util/env');
const { getParamsForGeneratorFiles, getHelperFiles } = require('../../../synthetic-content-generator/start-helpers');

const processorContext = getOrCreateContext('scgContext');
const { setCommonContext } = processorContext;

const SCG_QUEUE_NAME = 'scgRunner';
const scgRunnerConcurrency = +process.env.SCG_RUNNER_CONCURRENCY || 1;

function getCorePath() {
  return process.cwd();
}

async function createScgQueue({ appLib, log }) {
  const corePath = getCorePath();
  const schemaPath = getSchemaPaths();
  const pregeneratorFiles = getHelperFiles(corePath, schemaPath, 'pregenerators');
  const paramsForGeneratorFiles = await getParamsForGeneratorFiles({
    pregeneratorFiles,
    appLib,
    batchName: '', // this one will be set in processor
    uploadDir: appLib.fileControllerUtil.DEFAULT_UPLOAD_DIR,
  });

  const generatorFiles = getHelperFiles(corePath, schemaPath, 'generators');

  setCommonContext({ appLib, log, generatorFiles, paramsForGeneratorFiles });

  const scgRunnerQueue = appLib.queue.createQueue(SCG_QUEUE_NAME);
  addQueueEventHandlers({ appLib, bullQueue: scgRunnerQueue, log, enableNotifications: true });

  scgRunnerQueue.process(scgRunnerConcurrency, require('./scg-processor')(processorContext));

  return scgRunnerQueue;
}

function fixArgs(args, allowedCollections) {
  const { count, batchName, collectionName } = args;
  const errors = [];

  if (!_.isNumber(count) || count < 0) {
    errors.push(`Argument 'count' must be a positive number`);
    args.count = Math.max(count, 10000000);
  }

  if (!batchName) {
    args.batchName = new Date().toISOString();
  }

  if (!allowedCollections.includes(collectionName)) {
    errors.push(`Argument 'collectionName' contains invalid collection name '${collectionName}'`);
  }

  return { errors, args };
}

function getAllowedCollections(models) {
  const restrictedCollections = ['users', 'roles', 'files', 'dxGridViews', 'datasets'];
  return Object.keys(models).filter((c) => !restrictedCollections.includes(c));
}

async function runScg({ creator, appLib, log, args }) {
  try {
    const allowedCollections = getAllowedCollections(appLib.appModel.models);
    const { args: fixedArgs, errors: argsErrors } = fixArgs(args, allowedCollections);
    if (argsErrors.length) {
      return {
        success: false,
        message: `Invalid arguments found: ${argsErrors.join('. ')}`,
      };
    }

    const scgRunnerQueue = appLib.queue.getQueue(SCG_QUEUE_NAME);
    const job = await scgRunnerQueue.add({ args: fixedArgs, creator });
    return {
      success: true,
      data: { queueName: SCG_QUEUE_NAME, jobId: job.id },
    };
  } catch (error) {
    const defaultMessage = `Unable to add a job to generate data.`;
    return handleJobError({ error, log, defaultMessage });
  }
}

module.exports = {
  createScgQueue,
  runScg,
};
