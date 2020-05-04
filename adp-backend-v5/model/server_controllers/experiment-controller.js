const _ = require('lodash');
const Promise = require('bluebird');
const log = require('log4js').getLogger('experiment-controller');

const { createExperimentsQueue, runExperiment } = require('../../lib/queue/jobs/experiments');
const { createDmnQueue } = require('../../lib/queue/jobs/dmn');
const { createBpmnQueue } = require('../../lib/queue/jobs/bpmn');
const { createAimlQueue } = require('../../lib/queue/jobs/aiml');
const { getCreator } = require('../../lib/queue/jobs/util');

module.exports = () => {
  const m = {};

  m.init = async (appLib) => {
    if (!appLib.queue.isReady()) {
      log.warn(`DMN runner is disabled due to required Bull queue is disabled`);
      return;
    }

    if (process.env.JAVA_ENABLE !== 'true') {
      log.warn(`DMN runner is disabled due to required JAVA is disabled`);
      return;
    }

    m.appLib = appLib;
    m.ValidationError = appLib.errors.ValidationError;

    await Promise.all([
      createDmnQueue({ appLib, log }),
      createBpmnQueue({ appLib, log }),
      createAimlQueue({ appLib, log }),
      createExperimentsQueue({ appLib, log }),
    ]);

    appLib.addRoute('get', `/experimentRun/:experimentId`, [appLib.isAuthenticated, m.runExperiment]);
  };

  m.runExperiment = async (req, res) => {
    const _id = _.get(req, 'params.experimentId');
    const { user } = req;
    const creator = getCreator(m.appLib, user);

    const { success, message, data } = await runExperiment({ _id, creator, req, appLib: m.appLib, log });
    return res.json({ success, message, data });
  };

  return m;
};
