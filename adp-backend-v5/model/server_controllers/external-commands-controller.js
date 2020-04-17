const _ = require('lodash');
const { ObjectID } = require('mongodb');
const log = require('log4js').getLogger('external-commands-controller');

const { getDocValueForExpression } = require('../../lib/util/util');
const { addLogsAndNotificationsForQueueEvents } = require('../../lib/util/backgroundJobs');
const { getOrCreateContext } = require('../../lib/graphql/background-jobs/processors/processor-context');

const processorContext = getOrCreateContext('externalCommandsContext');
const { setCommonContext } = processorContext;

const EXTERNAL_COMMANDS_QUEUE_NAME = 'externalCommands';
const runnerConcurrency = +process.env.EXTERNAL_COMMANDS_RUNNER_CONCURRENCY || 1;
const commandsCollectionName = 'bjrExternalCommands';

module.exports = () => {
  const m = {};

  m.init = async (appLib) => {
    if (!appLib.queue.isReady()) {
      log.warn(`External commands runner is disabled due to required Bull queue is disabled`);
      return;
    }

    m.appLib = appLib;
    setCommonContext({ log });

    createQueue();
    appLib.addRoute('get', `/runExternalCommand/:commandId`, [appLib.isAuthenticated, m.runExternalCommand]);
  };

  function createQueue() {
    m.externalCommandRunnerQueue = m.appLib.queue.createQueue(EXTERNAL_COMMANDS_QUEUE_NAME);
    addLogsAndNotificationsForQueueEvents(m.appLib, m.externalCommandRunnerQueue, log);

    m.externalCommandRunnerQueue.process(
      runnerConcurrency,
      require('../../lib/graphql/background-jobs/processors/external-command-processor')(processorContext)
    );
  }

  m.runExternalCommand = async (req, res) => {
    const commandId = _.get(req, 'params.commandId');
    try {
      const externalCommand = await m.appLib.db
        .collection(commandsCollectionName)
        .findOne({ _id: ObjectID(commandId) });
      const { name, command, progressRegex, logRegex } = externalCommand || {};
      if (!name || !command) {
        return res.json({
          success: false,
          message: `Invalid external command record by _id '${commandId}'`,
        });
      }

      const userLabel = _.get(m.appLib.appModel.models.backgroundJobs, 'creator.lookup.table.users.label');
      const creatorId = req.user._id;
      // pass creator for tracking user in redis data
      const creator = {
        _id: creatorId, // it's passed as string to redis job
        table: 'users',
        label: userLabel ? getDocValueForExpression(req.user, userLabel) : req.user.login,
      };
      const job = await m.externalCommandRunnerQueue.add({
        creator,
        commandId,
        name,
        command,
        progressRegex,
        logRegex,
      });

      log.info(`Added a job with id '${job.id}' for external command with id '${commandId}''`);
      res.json({
        success: true,
        data: { queueName: EXTERNAL_COMMANDS_QUEUE_NAME, jobId: job.id, commandId },
      });
    } catch (e) {
      const defaultErrMessage = `Unable to add a job for command with id '${commandId}'.`;
      if (e instanceof m.ValidationError) {
        log.error(defaultErrMessage, e.message);
        return res.json({ success: false, message: e.message });
      }

      log.error(defaultErrMessage, e.stack);
      res.json({ success: false, message: defaultErrMessage });
    }
  };

  return m;
};
