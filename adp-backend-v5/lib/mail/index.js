const _ = require('lodash');
const mailer = require('nodemailer');

module.exports = (appLib) => {
  const m = {};
  let smtpTransport;
  let transportOpts;

  async function getSmtpTransport() {
    if (!smtpTransport) {
      await m.updateSmtpTransport();
    }
    return smtpTransport;
  }

  async function getAuthFromCredentials(credentialsName) {
    const record = await appLib.db.collection('_credentials').findOne({ name: credentialsName });
    if (!record) {
      throw new Error(
        `Unable to get smtp options due to absence of _credentials record with name '${credentialsName}'.`
      );
    }

    try {
      const { decrypt } = appLib.crypto;
      return {
        user: decrypt(record.login),
        pass: decrypt(record.password),
      };
    } catch (e) {
      throw new Error(`Unable to decrypt '${credentialsName}' _credentials record. ${e.stack}`);
    }
  }

  m.getTransportOptsFromCredentials = async (credentialsName) => {
    const auth = await getAuthFromCredentials(credentialsName);
    return m.getTransportOpts(auth);
  };

  m.getTransportOpts = (auth) => {
    const { EMAIL_SERVICE, EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_POOL } = appLib.config;

    if (EMAIL_SERVICE) {
      return { service: EMAIL_SERVICE, auth };
    }

    return {
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      pool: EMAIL_POOL,
      auth,
    };
  };

  m.updateSmtpTransport = async () => {
    const newTransportOpts = await m.getTransportOptsFromCredentials(appLib.config.EMAIL_CREDENTIALS);
    if (_.isEqual(transportOpts, newTransportOpts)) {
      return;
    }

    const newSmtpTransport = mailer.createTransport(newTransportOpts);
    try {
      await newSmtpTransport.verify();
    } catch (e) {
      throw new Error(`Unable to establish SMTP connection for new options. ${e.stack}`);
    }
    transportOpts = newTransportOpts;
    smtpTransport = newSmtpTransport;
  };

  m.sendMail = async (mail) => {
    smtpTransport = await getSmtpTransport();
    return smtpTransport.sendMail(mail);
  };

  m.getForgotPasswordMail = (email, token, login) => {
    const { FRONTEND_URL, APP_NAME } = appLib.config;
    const resetUrlWithToken = `${FRONTEND_URL}/password/reset?token=${token}&login=${login}`;
    return {
      to: email,
      // TODO: add site name? for example 'Reset your password on ${siteName}'
      subject: `Reset your ${APP_NAME} password`,
      html: getResetPasswordHtml(resetUrlWithToken),
    };
  };

  function getResetPasswordHtml(resetUrlWithToken) {
    return `
  <!DOCTYPE html>
  <html>
    <head>
    </head>
    <body>
      <h1 style="color: black"></h1>
      <div style="font-size: 18px; margin-bottom: 15px; color: black">
        You are receiving this email because you (or someone else) have requested the reset of the password for your account.
        <br>
        Please click on the following <a href="${resetUrlWithToken}">reset password link</a> to complete the process
        <br>
        If you did not request this, please ignore this email and your password will remain unchanged.
      </div>
    </body>
  </html>
  `;
  }

  m.getSuccessfulPasswordResetMail = (to) => ({
    to,
    subject: `Your ${appLib.config.APP_NAME} password has been changed`,
    html: getSuccessfulPasswordResetHtml(to),
  });

  function getSuccessfulPasswordResetHtml(email) {
    return `
  <!DOCTYPE html>
  <html>
    <head>
    </head>
    <body>
      <h1 style="color: black"></h1>
      <div style="font-size: 18px; margin-bottom: 15px; color: black">
        Hello,
        <br>
        This is a confirmation that the password for your account ${email} has just been changed.
      </div>
    </body>
  </html>
  `;
  }

  return m;
};
