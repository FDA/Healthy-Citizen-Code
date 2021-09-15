const _ = require('lodash');
const { ObjectID } = require('mongodb');
const log = require('log4js').getLogger('otp-controller');

module.exports = function (appLib) {
  const m = {};
  const User = appLib.db.collection('users');
  const { config } = appLib;
  m.appLib = appLib;

  const { generateSecret, generateBackupTokens, getTotpAuthUrl, getQrCodeDataUrl, verifyToken } = m.appLib.otp;

  m.init = () => {
    if (!config.MFA_ENABLED) {
      return;
    }

    appLib.addRoute('post', '/otpSecret', [m.getOtpSecret]);
    appLib.addRoute('get', '/newBackupCodes', [appLib.isAuthenticated, m.getNewBackupCodes]);
    appLib.addRoute('post', '/enableTwoFactor', [appLib.isAuthenticated, m.enableTwoFactor]);
    appLib.addRoute('post', '/verifyOtpCode', [m.verifyOtpCode]);
    appLib.addRoute('post', '/disableOtp', [appLib.isAuthenticated, m.disableOtp]);
    appLib.addRoute('get', '/backupCodes', [appLib.isAuthenticated, m.getCurrentBackupCodes]);
    appLib.addRoute('get', '/clearBackupCodes', [appLib.isAuthenticated, m.clearBackupCodes]);
  };

  m.getOtpSecret = async (req, res) => {
    try {
      const { login = 'username' } = req.body;
      const { title: appTitle } = appLib.appModel.interface.app;
      const secret = generateSecret();
      const totpAuthUrl = getTotpAuthUrl({ label: login, issuer: appTitle, secret });
      const qrCodeDataUrl = await getQrCodeDataUrl(totpAuthUrl);

      req.session.otp = { secret };
      res.json({ success: true, data: { base32: secret, qrCodeDataUrl } });
    } catch (e) {
      log.error(e.stack);
      return res.json({ success: false, message: `Unable to get OTP secret.` });
    }
  };

  m.enableTwoFactor = async (req, res) => {
    try {
      const { otpCode } = req.body;
      const secret = _.get(req.session, 'otp.secret');
      const user = _.get(req, 'user');
      const isVerified = verifyToken({ secret, token: otpCode });

      if (!isVerified) {
        return res.json({ success: false, message: `OTP code is not match. Please try again.` });
      }

      await User.hookQuery(
        'updateOne',
        { _id: ObjectID(user._id) },
        {
          $set: {
            twoFactorSecret: secret,
            enableTwoFactor: true,
            twoFactorBackupCounter: null,
            twoFactorUsedCounters: null,
          },
        }
      );

      res.json({ success: true, message: `Two-factor authentication is set successfully` });
    } catch (e) {
      log.error(e.stack);
      return res.json({ success: false, message: `Unable to save OTP secret.` });
    }
  };

  m.verifyOtpCode = async (req, res) => {
    try {
      const { otpCode } = req.body;
      const secret = _.get(req.session, 'otp.secret');

      const isVerified = verifyToken({ secret, token: otpCode });

      if (!isVerified) {
        return res.json({ success: false, message: `OTP code is not match. Please try again.` });
      }

      req.session.otp = { secret, verified: true };
      res.json({ success: true });
    } catch (e) {
      log.error(e.stack);
      return res.json({ success: false, message: `Unable to verify OTP secret.` });
    }
  };

  m.disableOtp = async (req, res) => {
    if (config.MFA_REQUIRED) {
      return res.json({
        success: false,
        message: `This application requires multi-factor authentication (MFA) and it cannot be disabled`,
      });
    }

    try {
      const user = _.get(req, 'user');

      await User.hookQuery(
        'updateOne',
        { _id: ObjectID(user._id) },
        {
          $set: {
            twoFactorSecret: null,
            enableTwoFactor: false,
            twoFactorBackupCounter: null,
            twoFactorUsedCounters: null,
          },
        }
      );

      res.json({ success: true, message: `Two-factor authentication is disabled` });
    } catch (e) {
      log.error(e.stack);
      return res.json({ success: false, message: `Unable to disable OTP.` });
    }
  };

  m.getNewBackupCodes = async (req, res) => {
    const counter = Math.floor(Math.random() * 1000000000) + 1;
    const user = _.get(req, 'user');

    if (!user) {
      return res.json({ success: false, message: `Unable to get user for OTP.` });
    }

    const codes = generateBackupTokens({ secret: user.twoFactorSecret, counter });

    await User.hookQuery(
      'updateOne',
      { _id: ObjectID(user._id) },
      { $set: { twoFactorBackupCounter: counter, twoFactorUsedCounters: null } }
    );

    res.json({ success: true, codes, counter });
  };

  m.getCurrentBackupCodes = async (req, res) => {
    const user = _.get(req, 'user');

    if (!user) {
      return res.json({ success: false, message: `Unable to get user for OTP.` });
    }

    const { twoFactorUsedCounters, twoFactorBackupCounter } = user;
    let codes = [];

    if (twoFactorBackupCounter) {
      codes = generateBackupTokens({
        secret: user.twoFactorSecret,
        counter: twoFactorBackupCounter,
      });
    }

    res.json({ success: true, codes, used: twoFactorUsedCounters || [] });
  };

  m.clearBackupCodes = async (req, res) => {
    const user = _.get(req, 'user');

    if (!user) {
      return res.json({ success: false, message: `Unable to get user for OTP.` });
    }

    await User.hookQuery(
      'updateOne',
      { _id: ObjectID(user._id) },
      { $set: { twoFactorBackupCounter: null, twoFactorUsedCounters: null } }
    );

    res.json({ success: true, message: `Backup codes are cleared successfully` });
  };

  return m;
};
