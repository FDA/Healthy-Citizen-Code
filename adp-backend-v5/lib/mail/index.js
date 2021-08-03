const mailer = require('nodemailer');

module.exports = (config) => {
  const m = {};

  m.sendMail = async (mail) => {
    const smtpTransport = mailer.createTransport(getTransportOpts());

    try {
      return await smtpTransport.sendMail(mail);
    } finally {
      smtpTransport.close();
    }
  };

  function getTransportOpts() {
    const auth = {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASSWORD,
    };

    if (config.EMAIL_SERVICE) {
      return {
        service: config.EMAIL_SERVICE,
        auth,
      };
    }

    return {
      host: config.EMAIL_HOST,
      port: config.EMAIL_PORT,
      secure: config.EMAIL_SECURE,
      pool: config.EMAIL_POOL,
      auth,
    };
  }

  m.getForgotPasswordMail = (email, token, login) => {
    const resetUrlWithToken = `${config.FRONTEND_URL}/password/reset?token=${token}&login=${login}`;
    return {
      to: email,
      // TODO: add site name? for example 'Reset your password on ${siteName}'
      subject: `Reset your ${config.APP_NAME} password`,
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
    subject: `Your ${config.APP_NAME} password has been changed`,
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
