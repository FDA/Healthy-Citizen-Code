const _ = require('lodash');
const log = require('log4js').getLogger('external-commands-controller');

const { runExternalCommand, createExternalCommandQueue } = require('../../lib/queue/jobs/external-commands');
const { getCreator } = require('../../lib/queue/jobs/util');

module.exports = () => {
  const m = {};

  m.init = async (appLib) => {
    if (!appLib.queue.isReady()) {
      log.warn(`External commands runner is disabled due to required Bull queue is disabled`);
      return;
    }
    m.appLib = appLib;
    await createExternalCommandQueue({ appLib, log });
    appLib.addRoute('get', `/runExternalCommand/:commandId`, [appLib.isAuthenticated, m.runExternalCommand]);
  };

  m.runExternalCommand = async (req, res) => {
    const commandId = _.get(req, 'params.commandId');
    const { user } = req;
    const creator = getCreator(m.appLib, user);

    const { success, message, data } = await runExternalCommand({ commandId, creator, appLib: m.appLib, log });
    return res.json({ success, message, data });
  };

  return m;
};
