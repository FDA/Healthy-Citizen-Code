const log = require('log4js').getLogger('trino-controller');
const mailer = require('nodemailer');

module.exports = () => {
  const m = {};

  m.init = async (appLib) => {
    m.appLib = appLib;
    appLib.addRoute('post', `/test-email`, [m.appLib.isAuthenticated, m.testEmail]);
  };

  m.testEmail = async (req, res) => {
    try {
      const userPermissions = m.appLib.accessUtil.getReqPermissions(req);
      if (!userPermissions.has(m.appLib.accessCfg.PERMISSIONS.accessAsSuperAdmin)) {
        return res.status(403).json({ success: false, message: `Access forbidden` });
      }

      const { user, pass, credentialsName } = req.body;
      let transportOpts;
      if (credentialsName) {
        transportOpts = await m.appLib.mail.getTransportOptsFromCredentials(credentialsName);
      } else {
        transportOpts = m.appLib.mail.getTransportOpts({ user, pass });
      }

      try {
        const smtpTransport = mailer.createTransport(transportOpts);
        await smtpTransport.verify();
      } catch (e) {
        return res.json({ success: true, verified: false, message: e.message });
      }

      return res.json({ success: true, verified: true });
    } catch (e) {
      log.error(e.stack);
      return res.json({ success: false, message: e.message });
    }
  };

  return m;
};
