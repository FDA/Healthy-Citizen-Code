const { getServicesScheme } = require('../../lib/queue/background-jobs/bpmn/services');

module.exports = () => {
  const m = {};

  m.init = async (appLib) => {
    m.bpmnServicesScheme = getServicesScheme();
    appLib.addRoute('get', `/getBpmnServicesScheme`, [appLib.isAuthenticated, m.getBpmnServicesScheme]);
  };

  m.getBpmnServicesScheme = async (req, res) => {
    return res.json({ success: true, data: m.bpmnServicesScheme });
  };

  return m;
};
