const log = require('log4js').getLogger('trino-controller');

module.exports = () => {
  const m = {};

  m.init = async (appLib) => {
    m.appLib = appLib;
    appLib.addRoute('post', `/update-trino-schema`, [m.appLib.isAuthenticated, m.updateTrinoSchemas]);
  };

  m.updateTrinoSchemas = async (req, res) => {
    try {
      const userPermissions = m.appLib.accessUtil.getReqPermissions(req);
      if (!userPermissions.has('manageTrinoSchema')) {
        return res.status(403).json({ success: false, message: `Access forbidden` });
      }
      await m.appLib.trino.upsertAllTrinoSchemas();

      return res.json({ success: true });
    } catch (e) {
      log.error(e.stack);
      return res.json({ success: false, message: e.message });
    }
  };

  return m;
};
