const { ObjectID } = require('mongodb');
const { addQueueEventHandlers } = require('../util');
const { getOrCreateContext } = require('../processor-context');
const { ValidationError } = require('../../../errors');

const processorContext = getOrCreateContext('externalCommandsContext');
const { setCommonContext } = processorContext;

const EXTERNAL_COMMANDS_QUEUE_NAME = 'externalCommands';
const commandsCollectionName = 'bjrExternalCommands';

async function createExternalCommandQueue({ appLib, log }) {
  setCommonContext({ appLib, log });

  const externalCommandRunnerQueue = appLib.queue.createQueue(EXTERNAL_COMMANDS_QUEUE_NAME);
  addQueueEventHandlers({ appLib, bullQueue: externalCommandRunnerQueue, log, enableNotifications: true });

  externalCommandRunnerQueue.process(
    appLib.config.EXTERNAL_COMMANDS_RUNNER_CONCURRENCY,
    require('./external-command-processor')(processorContext)
  );

  return externalCommandRunnerQueue;
}

async function runExternalCommand({ commandId, creator, appLib, log }) {
  try {
    const externalCommandRunnerQueue = appLib.queue.getQueue(EXTERNAL_COMMANDS_QUEUE_NAME);
    const { record: externalCommand } = await appLib.db
      .collection(commandsCollectionName)
      .hookQuery('findOne', { _id: ObjectID(commandId) });
    const {
      name,
      type = 'shellCommand',
      command,
      backendCommand,
      progressRegex,
      logRegex = '[\\s\\S]+',
    } = externalCommand || {};
    const isCommandSpecified = !!(command || backendCommand);
    if (!name || !type || !isCommandSpecified) {
      return {
        success: false,
        message: `Invalid external command record by _id '${commandId}'`,
      };
    }

    const job = await externalCommandRunnerQueue.add({
      creator,
      commandId,
      name,
      type,
      command,
      backendCommand,
      progressRegex,
      logRegex,
    });

    log.info(`Added a job with id '${job.id}' for external command with id '${commandId}''`);
    return {
      success: true,
      data: { queueName: EXTERNAL_COMMANDS_QUEUE_NAME, jobId: job.id, commandId },
    };
  } catch (e) {
    const defaultErrMessage = `Unable to add a job for command with id '${commandId}'.`;
    if (e instanceof ValidationError) {
      log.error(defaultErrMessage, e.message);
      return { success: false, message: e.message };
    }

    log.error(defaultErrMessage, e.stack);
    return { success: false, message: defaultErrMessage };
  }
}

module.exports = {
  runExternalCommand,
  createExternalCommandQueue,
  EXTERNAL_COMMANDS_QUEUE_NAME,
  commandsCollectionName,
};
