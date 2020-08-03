const _ = require('lodash');
const log = require('log4js').getLogger('scg-controller');

const { createScgQueue, runScg } = require('../../lib/queue/background-jobs/scg');
const { getCreator } = require('../../lib/queue/background-jobs/util');

module.exports = () => {
  const m = {};

  m.init = async (appLib) => {
    if (!appLib.queue.isReady()) {
      log.warn(`SCG runner is disabled due to required Bull queue is disabled`);
      return;
    }
    m.appLib = appLib;

    await createScgQueue({ appLib, log });
    appLib.addRoute('post', `/scgRun`, [appLib.isAuthenticated, m.runScg]);
  };

  m.runScg = async (req, res) => {
    const args = _.get(req.body, 'args', {});
    const { user } = req;
    const creator = getCreator(m.appLib, user);

    const { success, message, data } = await runScg({ creator, appLib: m.appLib, log, args });
    return res.json({ success, message, data });
  };

  return m;
};
