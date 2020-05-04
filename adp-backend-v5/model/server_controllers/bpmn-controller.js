// const _ = require('lodash');
// const log = require('log4js').getLogger('dmn-controller');
//
// const { createBpmnQueue, runBpmnProcess } = require('../../lib/queue/jobs/bpmn');
// const { getCreator } = require('../../lib/queue/jobs/util');

module.exports = () => {
  const m = {};

  m.init = async (/* appLib */) => {
    // TODO: bpmn processes are executed with experiments, decide if we need current controller
    // if (!appLib.queue.isReady()) {
    //   log.warn(`BPMN runner is disabled due to required Bull queue is disabled`);
    //   return;
    // }
    //
    // if (process.env.JAVA_ENABLE !== 'true') {
    //   log.warn(`BPMN runner is disabled due to required JAVA (for running DMN) is disabled`);
    //   return;
    // }
    //
    // m.appLib = appLib;
    //
    // await createBpmnQueue({ appLib, log });
    // appLib.addRoute('get', `/processRun/:bpmnProcessId`, [appLib.isAuthenticated, m.runBpmnProcess]);
  };

  // m.runBpmnProcess = async (req, res) => {
  //   const _id = _.get(req, 'params.bpmnProcessId');
  //   const { user } = req;
  //   const creator = getCreator(m.appLib, user);
  //
  //   const { success, message, data } = await runBpmnProcess({ _id, creator, appLib: m.appLib, log });
  //   return res.json({ success, message, data });
  // };

  return m;
};
