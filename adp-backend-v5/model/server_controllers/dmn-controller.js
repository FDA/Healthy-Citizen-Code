// const _ = require('lodash');
// const log = require('log4js').getLogger('dmn-controller');
//
// const { runDmnRule, createDmnQueue } = require('../../lib/queue/jobs/dmn');
// const { getCreator } = require('../../lib/queue/jobs/util');

module.exports = () => {
  const m = {};

  m.init = async (/* appLib */) => {
    // TODO: dmn rules are executed with experiments, decide if we need current controller
    // if (!appLib.queue.isReady()) {
    //   log.warn(`DMN runner is disabled due to required Bull queue is disabled`);
    //   return;
    // }
    //
    // if (process.env.JAVA_ENABLE !== 'true') {
    //   log.warn(`DMN runner is disabled due to required JAVA is disabled`);
    //   return;
    // }
    //
    // m.appLib = appLib;
    //
    // await createDmnQueue({ appLib, log });
    // appLib.addRoute('get', `/rulesRun/:ruleId`, [appLib.isAuthenticated, m.runDmnRule]);
  };

  // m.runDmnRule = async (req, res) => {
  //   const _id = _.get(req, 'params.ruleId');
  //   const { user } = req;
  //   const creator = getCreator(m.appLib, user);
  //
  //   const { success, message, data } = await runDmnRule({ _id, creator, appLib: m.appLib, log });
  //   return res.json({ success, message, data });
  // };

  return m;
};
