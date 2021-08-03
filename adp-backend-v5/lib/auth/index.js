const Promise = require('bluebird');
const _ = require('lodash');
const { v4: uuidv4 } = require('uuid');
const ms = require('ms');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const log4js = require('log4js');

const { ValidationError, InvalidTokenError, ExpiredTokenError } = require('../errors');
const { comparePassword } = require('../util/password');

const { asyncLocalStorage } = require('../async-local-storage');

const log = log4js.getLogger('lib/auth');

module.exports = (appLib) => {
  const { config } = appLib;

  const m = {};

  const { db, accessUtil, getAuthSettings } = appLib;
  const authSettings = getAuthSettings();
  const isRequiredAuth = authSettings.requireAuthentication === true;

  m.getExpiryDate = (millisFromNow, now = Date.now()) => new Date(now + millisFromNow);

  m.getResetToken = () => uuidv4();
  m.getRefreshToken = () => uuidv4();
  m.createAccessToken = (userId) =>
    jwt.sign({ id: userId }, config.JWT_SECRET, { expiresIn: config.JWT_ACCESS_TOKEN_EXPIRES_IN });

  m.tokensCollectionName = 'tokens';
  m.bannedUsersCollectionName = 'bannedUsers';
  m.refreshTokenCookieName = 'refresh_token';
  const Tokens = db.collection(m.tokensCollectionName);
  const { verifyToken, verifyBackupToken } = appLib.otp;

  const {
    LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN_MESSAGE,
    LOGIN_MAX_FAILED_LOGIN_ATTEMPTS,
    LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN,
    LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME,
    INACTIVITY_LOGOUT_IN,
    IS_INACTIVITY_LOGOUT_ENABLED,
    LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE,
    ACCOUNT_INACTIVITY_LOCKOUT_TIME,
    ACCOUNT_INACTIVITY_LOCKOUT_MESSAGE,
    USER_MAX_SIMULTANEOUS_SESSIONS,
    MFA_ENABLED,
    MFA_REQUIRED,
    MFA_OTP_MAX_TOKEN_ATTEMPTS,
    MFA_OTP_MAX_FAILED_LOGIN_ATTEMPTS_TIME,
    MFA_OTP_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN,
  } = config;
  const cookieOpts = require('../util/cookie').getCookieOpts(config);
  const refreshTokenCookieOpts = { ...cookieOpts, httpOnly: true, maxAge: config.JWT_REFRESH_TOKEN_EXPIRES_IN };
  m.setRefreshTokenCookie = (res, refreshToken) => {
    res.cookie(m.refreshTokenCookieName, refreshToken, refreshTokenCookieOpts);
  };

  const headerParseRegex = /(\S+)\s+(\S+)/;
  const authHeaderName = 'authorization';
  const authScheme = 'jwt';
  function parseAuthHeader(headerValue) {
    if (typeof headerValue !== 'string') {
      return null;
    }
    const matches = headerValue.match(headerParseRegex);
    return matches && { scheme: matches[1].toLowerCase(), value: matches[2] };
  }
  m.extractJwtFromRequest = function (request) {
    const authHeaderValue = request.headers[authHeaderName];
    if (authHeaderValue) {
      const authParams = parseAuthHeader(authHeaderValue);
      if (authParams && authScheme === authParams.scheme) {
        return authParams.value;
      }
    }
    return null;
  };

  const usersCollectionName = 'users';
  const User = db.collection(usersCollectionName);

  async function hasReachedMaxSessions(userId) {
    if (USER_MAX_SIMULTANEOUS_SESSIONS === 0) {
      return false;
    }
    const activeTokensCount = await m.getActiveTokensCount(userId);
    return activeTokensCount >= USER_MAX_SIMULTANEOUS_SESSIONS;
  }

  m.authenticateByPassword = async (req) => {
    const { login: inputLogin, password: inputPassword } = req.body;

    const { record: user } = await User.hookQuery('findOne', {
      $or: [{ login: inputLogin }, { email: inputLogin }],
    });
    if (!user) {
      appLib.auditLoggers.auth({ message: `User attempted to login with incorrect login '${inputLogin}'`, req });
      return { success: false, message: 'Invalid login or password' };
    }

    const { login, _id } = user;
    if (user.disabledAt) {
      appLib.auditLoggers.auth({ message: `Disabled user '${login}' attempted to login`, req, user });
      return { success: false, message: LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE };
    }

    if (ACCOUNT_INACTIVITY_LOCKOUT_TIME) {
      if (user.accountInactivityLockedAt) {
        appLib.auditLoggers.auth({
          message: `Locked due to inactivity user '${login}' attempted to login`,
          req,
          user,
        });
        return { success: false, message: ACCOUNT_INACTIVITY_LOCKOUT_MESSAGE };
      }

      const lastLoginDate = user.lastLoginAt || user.createdAt;
      if (_.isDate(lastLoginDate)) {
        const now = new Date();
        const inactivityLockoutDate = new Date(lastLoginDate.getTime() + ACCOUNT_INACTIVITY_LOCKOUT_TIME);
        if (now > inactivityLockoutDate) {
          await User.hookQuery('updateOne', { _id }, { $set: { accountInactivityLockedAt: now } });
          appLib.auditLoggers.auth({
            message: `User '${login}' attempted to login, but this account is locked due to a long period of inactivity`,
            req,
            user,
          });
          return { success: false, message: ACCOUNT_INACTIVITY_LOCKOUT_MESSAGE };
        }
      }
    }

    const currentLoginAttemptDate = new Date();
    if (user.loginCooldownAt >= currentLoginAttemptDate) {
      appLib.auditLoggers.auth({ message: `User '${login}' on login cooldown attempted to login`, req, user });
      return { success: false, message: LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN_MESSAGE };
    }

    const isMatched = await comparePassword(inputPassword, user.password);
    if (isMatched) {
      if (await hasReachedMaxSessions(_id)) {
        appLib.auditLoggers.auth({
          message: `User '${login}' attempted login with the simultaneous sessions limit reached`,
          req,
          user,
        });
        return { success: false, message: 'Simultaneous sessions limit is reached' };
      }

      return { success: true, user };
    }

    if (!LOGIN_MAX_FAILED_LOGIN_ATTEMPTS) {
      appLib.auditLoggers.auth({
        message: `User '${login}' attempted login with incorrect credentials`,
        req,
        user,
      });
      return { success: false, message: 'Invalid login or password' };
    }

    let failedLoginAttempts = user.failedLoginAttempts || [];
    failedLoginAttempts.push(currentLoginAttemptDate);
    // save only allowed amount of failed login attempts + 1 to avoid bloating the array
    failedLoginAttempts = failedLoginAttempts.slice(-(LOGIN_MAX_FAILED_LOGIN_ATTEMPTS + 1));
    const isAccountOnLoginCooldown = getIsAccountOnLoginCooldown(
      failedLoginAttempts,
      LOGIN_MAX_FAILED_LOGIN_ATTEMPTS,
      LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME
    );
    if (!isAccountOnLoginCooldown) {
      await User.hookQuery('updateOne', { _id }, { $set: { failedLoginAttempts } });
      appLib.auditLoggers.auth({
        message: `User '${login}' attempted login with incorrect credentials`,
        req,
        user,
      });
      return { success: false, message: 'Invalid login or password' };
    }

    if (LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN <= 0) {
      await User.hookQuery('updateOne', { _id }, { $set: { disabledAt: currentLoginAttemptDate } });
      appLib.auditLoggers.auth({
        message: `User '${login}' attempted login with incorrect credentials. This account was locked due to excessive number of incorrect logins`,
        req,
        user,
      });
      return { success: false, locked: true, message: LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE };
    }

    const loginCooldownAt = new Date(currentLoginAttemptDate.getTime() + LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN);
    await User.hookQuery('updateOne', { _id }, { $set: { loginCooldownAt, failedLoginAttempts: [] } });
    appLib.auditLoggers.auth({
      message: `User '${login}' attempted login with incorrect credentials. This account is temporarily disabled due to excessive number of invalid login attempts`,
      req,
      user,
    });
    return { success: false, loginCooldownAt, message: LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN_MESSAGE };
  };

  function isMfaSecretValid(secret) {
    return !!secret;
  }
  m.authenticateByTwoFactor = async (req, user) => {
    if (!MFA_ENABLED) {
      return { success: true };
    }

    const contactAdminMsg = `Please contact the system administrator to configure MFA for you.`;
    const mfaRequiredMsg = `This application requires multi-factor authentication (MFA). Your account doesn't have a properly configured MFA. ${contactAdminMsg}`;
    if (!user.enableTwoFactor) {
      return MFA_REQUIRED ? { success: false, message: mfaRequiredMsg } : { success: true };
    }
    if (!isMfaSecretValid(user.twoFactorSecret)) {
      const mfaInvalidSecretMsg = `Your multi-factor authentication configuration is incorrect. ${contactAdminMsg}`;
      return { success: false, message: mfaInvalidSecretMsg };
    }

    const currentLoginAttemptDate = new Date();
    if (user.twoFactorLoginCooldownAt && new Date(user.twoFactorLoginCooldownAt) >= currentLoginAttemptDate) {
      appLib.auditLoggers.auth({ message: `User '${user.login}' on MFA login cooldown attempted to login`, req, user });
      return { success: false, message: config.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN_MESSAGE };
    }

    const { twoFactorToken } = req.body;
    if (!twoFactorToken) {
      return { success: false, otpRequired: true };
    }

    const verificationParams = {
      secret: user.twoFactorSecret,
      token: twoFactorToken,
    };
    const isVerified = verifyToken(verificationParams);
    if (isVerified) {
      return { success: true };
    }

    const backupVerificationParams = {
      ...verificationParams,
      counter: user.twoFactorBackupCounter,
    };
    const backupTokenCounter = verifyBackupToken(backupVerificationParams);
    const usedCountersList = user.twoFactorUsedCounters || [];
    const isBackupCodeVerified = backupTokenCounter !== null && !usedCountersList.includes(backupTokenCounter);
    if (isBackupCodeVerified) {
      usedCountersList.push(backupTokenCounter);
      await User.hookQuery(
        'updateOne',
        { _id: ObjectId(user._id) },
        { $set: { twoFactorUsedCounters: usedCountersList } }
      );
      return { success: true };
    }

    if (!MFA_OTP_MAX_TOKEN_ATTEMPTS) {
      appLib.auditLoggers.auth({
        message: `User '${user.login}' attempted login with incorrect MFA code`,
        req,
        user,
      });
      return { success: false, otpFailed: true, message: `Verification code is not match. Please try again.` };
    }

    let mfaFailedLoginAttempts = user.mfaFailedLoginAttempts || [];
    const currentAttemptDate = new Date();
    mfaFailedLoginAttempts.push(currentAttemptDate);
    // save only allowed amount of failed login attempts + 1 to avoid bloating the array
    mfaFailedLoginAttempts = mfaFailedLoginAttempts.slice(-(MFA_OTP_MAX_TOKEN_ATTEMPTS + 1));
    const isOnLoginCooldown = getIsAccountOnLoginCooldown(
      mfaFailedLoginAttempts,
      MFA_OTP_MAX_TOKEN_ATTEMPTS,
      MFA_OTP_MAX_FAILED_LOGIN_ATTEMPTS_TIME
    );
    if (!isOnLoginCooldown) {
      await User.hookQuery('updateOne', { _id: user._id }, { $set: { mfaFailedLoginAttempts } });
      appLib.auditLoggers.auth({
        message: `User '${user.login}' attempted login with incorrect MFA code`,
        req,
        user,
      });
      return { success: false, message: `Verification code is not match. Please try again.` };
    }

    if (MFA_OTP_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN <= 0) {
      await User.hookQuery('updateOne', { _id: user._id }, { $set: { disabledAt: currentLoginAttemptDate } });
      appLib.auditLoggers.auth({
        message: `User '${user.login}' attempted login with incorrect MFA code. This account was locked due to excessive number of incorrect attempts`,
        req,
        user,
      });
      return {
        success: false,
        otpFailed: true,
        locked: true,
        message: LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE,
      };
    }

    const twoFactorLoginCooldownAt = new Date(
      currentLoginAttemptDate.getTime() + MFA_OTP_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN
    );
    await User.hookQuery('updateOne', { _id: user._id }, { $set: { twoFactorLoginCooldownAt } });
    return {
      success: false,
      otpFailed: true,
      twoFactorLoginCooldownAt,
      message: `You exceeded the maximum number of logins using the multi-factor authentication (MFA). Please try again later.`,
    };
  };

  m.isPasswordForcedToChange = (userRecord) => {
    const { ACCOUNT_FORCED_PASSWORD_CHANGE_ENABLED, ACCOUNT_FORCED_PASSWORD_CHANGE_TIME } = appLib.config;
    if (userRecord && ACCOUNT_FORCED_PASSWORD_CHANGE_ENABLED) {
      const lastPasswordChangeDate = userRecord.lastPasswordChangeDate || userRecord.createdAt;
      const nextPasswordChangeDate = new Date(lastPasswordChangeDate.getTime() + ACCOUNT_FORCED_PASSWORD_CHANGE_TIME);
      const now = new Date();
      if (now >= nextPasswordChangeDate) {
        return true;
      }
    }
    return false;
  };

  m.isPasswordPreviouslyUsed = async (passwordsHashes, newPassword) => {
    const passwordMatches = await Promise.map(passwordsHashes, (hash) => comparePassword(newPassword, hash));
    const isNewPasswordPreviouslyUsed = passwordMatches.find((match) => match === true);
    return !!isNewPasswordPreviouslyUsed;
  };

  function getIsAccountOnLoginCooldown(loginAttempts, maxFailedAttempts, attemptsTime) {
    if (loginAttempts.length <= maxFailedAttempts) {
      return false;
    }

    const indexOfFirstAttempt = loginAttempts.length - maxFailedAttempts;
    const firstLoginAttemptDate = new Date(loginAttempts[indexOfFirstAttempt]);
    const lastLoginAttemptDate = new Date(_.last(loginAttempts));

    const isLastLoginWithinAttemptsTime =
      lastLoginAttemptDate <= new Date(firstLoginAttemptDate.getTime() + attemptsTime);
    return isLastLoginWithinAttemptsTime;
  }

  function throwInvalidTokenError(req, message) {
    appLib.auditLoggers.security({ message, req });
    throw new InvalidTokenError(message);
  }

  async function getUserFromReq(req) {
    const accessToken = m.extractJwtFromRequest(req);

    if (!accessToken) {
      if (isRequiredAuth) {
        throwInvalidTokenError(req, `Request with empty token`);
      }
      return null;
    }

    try {
      await m.checkAccessToken(accessToken);
      const jwtPayload = jwt.verify(accessToken, config.JWT_SECRET);
      const [{ record }] = await Promise.all([
        User.hookQuery('findOne', { _id: ObjectId(jwtPayload.id) }),
        m.prolongSession(accessToken),
      ]);

      if (!record) {
        throwInvalidTokenError(req, `Request with invalid user id`);
      }
      return record;
    } catch (e) {
      if (e.name === 'JsonWebTokenError') {
        throwInvalidTokenError(req, `Request with invalid token`);
      }
      if (e.name === 'TokenExpiredError') {
        const message = `Request with expired token`;
        appLib.auditLoggers.security({ message, req });
        throw new ExpiredTokenError(message);
      }
      throw e;
    }
  }

  m.authenticationCheck = async (req) => {
    const user = await getUserFromReq(req);
    const { roles, permissions } = await accessUtil.getRolesAndPermissionsForUser(user, req.device.type);
    return { user, roles, permissions };
  };

  m.isAuthenticated = async (req, res, next) => {
    try {
      const { user, roles, permissions } = await m.authenticationCheck(req);
      accessUtil.setReqAuth({ req, user, roles, permissions });
      const store = asyncLocalStorage.getStore();
      if (!store) {
        log.error(`Unable to get als store`, req);
      } else {
        store.user = _.pick(user, ['login', 'email', '_id']);
      }
      next();
    } catch (e) {
      if (e instanceof InvalidTokenError) {
        return res.status(401).json({ success: false, message: 'Invalid user session, please login' });
      }
      if (e instanceof ExpiredTokenError) {
        return res.status(401).json({ success: false, message: 'User session expired, please login again' });
      }
      log.error(e.stack);
      res.status(500).json({ success: false, message: `Error occurred during authentication process` });
    }
  };

  m.createTokensRecord = async (userId, login) => {
    const tokensRecord = {
      refreshToken: m.getRefreshToken(),
      refreshTokenExpire: m.getExpiryDate(config.JWT_REFRESH_TOKEN_EXPIRES_IN),
      accessToken: m.createAccessToken(userId),
      accessTokenExpire: m.getExpiryDate(config.JWT_ACCESS_TOKEN_EXPIRES_IN),
      userId,
      login,
    };
    if (IS_INACTIVITY_LOGOUT_ENABLED) {
      tokensRecord.sessionExpire = m.getExpiryDate(INACTIVITY_LOGOUT_IN);
    }

    const { record } = await Tokens.hookQuery('insertOne', tokensRecord, { checkKeys: false });
    return record;
  };

  m.removeTokensRecord = async ({ refreshToken, accessToken }) => {
    let condition;
    if (refreshToken) {
      condition = { refreshToken: { $eq: refreshToken } };
    } else if (accessToken) {
      condition = { accessToken: { $eq: accessToken } };
    } else {
      throw new Error('Unable to remove token record, refreshToken or accessToken should be presented.');
    }

    const { record } = await Tokens.hookQuery('findOneAndDelete', condition, { checkKeys: false });

    return record;
  };

  m.refreshTokensRecord = async (refreshToken, silent) => {
    const { record: oldRecord } = await Tokens.hookQuery('findOne', { refreshToken: { $eq: refreshToken } });
    if (!oldRecord) {
      throw new InvalidTokenError('Invalid refresh token');
    }

    const { refreshTokenExpire, accessToken: oldAccessToken, userId, sessionExpire } = oldRecord;
    if (refreshTokenExpire < Date.now()) {
      throw new ExpiredTokenError('Refresh token expired');
    }
    if (IS_INACTIVITY_LOGOUT_ENABLED && sessionExpire < Date.now()) {
      throw new ExpiredTokenError('Session expired');
    }

    const update = {
      refreshToken: m.getRefreshToken(),
      refreshTokenExpire: m.getExpiryDate(config.JWT_REFRESH_TOKEN_EXPIRES_IN),
      accessToken: m.createAccessToken(userId),
      accessTokenExpire: m.getExpiryDate(config.JWT_ACCESS_TOKEN_EXPIRES_IN),
      previousAccessToken: oldAccessToken,
    };
    if (IS_INACTIVITY_LOGOUT_ENABLED) {
      update.sessionExpire = silent ? sessionExpire : m.getExpiryDate(INACTIVITY_LOGOUT_IN);
    }

    const { record: newRecord } = await Tokens.hookQuery(
      'findOneAndUpdate',
      { refreshToken: { $eq: refreshToken } },
      { $set: update },
      { returnDocument: 'after', checkKeys: false }
    );

    return { newRecord, oldRecord };
  };

  m.checkAccessToken = async (accessToken) => {
    const { record } = await Tokens.hookQuery('findOne', {
      $or: [{ accessToken: { $eq: accessToken } }, { previousAccessToken: { $eq: accessToken } }],
    });
    if (!record) {
      throw new InvalidTokenError();
    }
    if (IS_INACTIVITY_LOGOUT_ENABLED && record.sessionExpire < Date.now()) {
      throw new ExpiredTokenError();
    }
    return record;
  };

  m.getActiveTokensCount = async (userId) => {
    const { opResult: count } = await Tokens.hookQuery('count', {
      $and: [{ accessTokenExpire: { $gt: new Date() }, userId: ObjectId(userId) }],
    });
    return count;
  };

  m.prolongSession = async (accessToken, prolongTimeMs = INACTIVITY_LOGOUT_IN) => {
    if (!IS_INACTIVITY_LOGOUT_ENABLED) {
      throw new ValidationError(`Unable to prolong session in current app configuration.`);
    }

    const sessionExpire = m.getExpiryDate(prolongTimeMs);
    const { record } = await Tokens.hookQuery(
      'findOneAndUpdate',
      {
        $or: [{ accessToken: { $eq: accessToken } }, { previousAccessToken: { $eq: accessToken } }],
        sessionExpire: { $gte: new Date() },
      },
      { $set: { sessionExpire } },
      { returnDocument: 'after', checkKeys: false }
    );

    if (!record) {
      throw new InvalidTokenError('Unable to prolong session, token is invalid.');
    }
    return sessionExpire;
  };

  m.getTokensRecord = async (accessToken) => {
    const { record } = await Tokens.hookQuery('findOne', {
      $or: [{ accessToken: { $eq: accessToken } }, { previousAccessToken: { $eq: accessToken } }],
    });
    return record;
  };

  m.updateSocketAccessToken = (oldAccessToken, newAccessToken) => {
    // Search for sockets within current node instance (not using broadcast event)
    // since sockets require sticky session (for switching protocol from long polling to websocket)
    // and all requests of specific user are routed to the same node instance
    _.each(appLib.ws.ioServer.nsps, (nsp) => {
      _.each(nsp.connected, (socket) => {
        if (socket.accessToken === oldAccessToken) {
          socket.accessToken = newAccessToken;
        }
      });
    });
  };

  m.disconnectSockets = (accessToken) => {
    _.each(appLib.ws.ioServer.nsps, (nsp) => {
      _.each(nsp.connected, (socket) => {
        if (socket.accessToken === accessToken && socket.connected) {
          socket.disconnect();
        }
      });
    });
  };

  m.logoutFromAllDevices = async (userId) => {
    const userTokenRecords = await Tokens.find(
      { userId: { $eq: ObjectId(userId) } },
      { _id: 1, accessToken: 1 }
    ).toArray();

    // const accessTokens = userTokenRecords.map((r) => r.accessToken);
    const userIds = userTokenRecords.map((r) => r._id);

    await db.collection(m.tokensCollectionName).deleteMany({ _id: { $in: userIds } });
  };

  m.banUser = async (userId, reason, banDuration = '100y') => {
    const now = Date.now();

    const { record } = await db
      .collection(m.bannedUsersCollectionName)
      .hookQuery('findOne', { _id: userId, toDate: { $gt: Date.now() } });

    if (record) {
      throw new Error(`User is already banned`);
    }

    const banDurationMillis = ms(banDuration);
    const toDate = banDuration instanceof Date ? banDuration : m.getExpiryDate(banDurationMillis, now);
    const { record: newRecord } = await db.collection(m.bannedUsersCollectionName).hookQuery(
      'insertOne',
      {
        userId,
        fromDate: now,
        toDate,
        reason,
      },
      { checkKeys: false }
    );

    await m.logoutFromAllDevices(userId);

    return newRecord;
  };

  m.isUserBanned = async (userId) => {
    const { record } = await db
      .collection(m.bannedUsersCollectionName)
      .hookQuery('findOne', { _id: userId, toDate: { $gt: Date.now() } });
    return record;
  };

  return m;
};
