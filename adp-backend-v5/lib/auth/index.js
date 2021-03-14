const Promise = require('bluebird');
const _ = require('lodash');
const uuidv4 = require('uuid/v4');
const ms = require('ms');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const { ExtractJwt } = require('passport-jwt');
const { ObjectId } = require('mongodb');
const log4js = require('log4js');

const { InvalidTokenError, ExpiredTokenError } = require('../errors');
const { comparePassword } = require('../util/password');
const { getUserLookup, getReqDuration } = require('../util/audit-log');
const { cookieOpts } = require('../util/cookie');

const jwtSecret = process.env.JWT_SECRET;
const { asyncLocalStorage } = require('../async-local-storage');

const log = log4js.getLogger('lib/auth');

module.exports = (appLib) => {
  const m = {};
  m.logAuthAudit = ({ message, req, user }) => {
    appLib.auditPersistLogger.info({
      type: 'auth',
      message,
      clientIp: req.ip,
      requestId: req.id,
      sessionId: req.sessionID,
      timestamp: new Date(),
      duration: getReqDuration(req),
      user: getUserLookup(user),
    });
  };
  m.logSecurityAudit = ({ message, req, user }) => {
    appLib.auditPersistLogger.info({
      type: 'security',
      message,
      clientIp: req.ip,
      requestId: req.id,
      sessionId: req.sessionID,
      timestamp: new Date(),
      duration: getReqDuration(req),
      user: getUserLookup(user),
    });
  };

  const { db, accessUtil, getAuthSettings } = appLib;
  const authSettings = getAuthSettings();
  const isRequiredAuth = authSettings.requireAuthentication === true;

  m.refreshTokenExpiresInMs = ms(process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '90d');
  m.accessTokenExpiresInMs = ms(process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '10m');
  m.resetPasswordTokenExpiresInMs = ms(process.env.RESET_PASSWORD_TOKEN_EXPIRES_IN || '1h');
  m.getExpiryDate = (millisFromNow, now = Date.now()) => new Date(now + millisFromNow);

  m.getResetToken = () => uuidv4();
  m.getRefreshToken = () => uuidv4();
  m.createAccessToken = (userId) => jwt.sign({ id: userId }, jwtSecret, { expiresIn: m.accessTokenExpiresInMs });

  m.tokensCollectionName = 'tokens';
  m.bannedUsersCollectionName = 'bannedUsers';
  m.refreshTokenCookieName = 'refresh_token';
  const Tokens = db.collection(m.tokensCollectionName);

  let inactivityLogoutNotificationAppearsInMs = ms(process.env.INACTIVITY_LOGOUT_NOTIFICATION_APPEARS_IN || '15m');
  const inactivityLogoutMs = ms(process.env.INACTIVITY_LOGOUT_IN || '20m');
  if (inactivityLogoutNotificationAppearsInMs > inactivityLogoutMs) {
    log.warn(
      `Set INACTIVITY_LOGOUT_NOTIFICATION_APPEARS_IN(${inactivityLogoutNotificationAppearsInMs}) to 0 since INACTIVITY_LOGOUT_IN(${inactivityLogoutMs}) must be bigger than that.`
    );
    inactivityLogoutNotificationAppearsInMs = 0;
  }

  m.inactivityLogoutNotificationAppearsInMs = inactivityLogoutNotificationAppearsInMs;
  m.inactivityLogoutMs = inactivityLogoutMs;
  m.isInactivityLogoutEnabled = inactivityLogoutMs > 0;
  m.inactivityLogoutNotificationAppearsFromSessionEnd = inactivityLogoutNotificationAppearsInMs
    ? inactivityLogoutMs - inactivityLogoutNotificationAppearsInMs
    : 0;

  const refreshTokenCookieOpts = { ...cookieOpts, httpOnly: true, maxAge: m.refreshTokenExpiresInMs };
  m.setRefreshTokenCookie = (res, refreshToken) => {
    res.cookie(m.refreshTokenCookieName, refreshToken, refreshTokenCookieOpts);
  };

  m.extractJwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('JWT');

  m.loginMaxFailedLoginAttempts = parseInt(process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS || 3, 10);
  // LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME is 0 then attempts window
  m.loginMaxFailedLoginAttemptsTime = ms(process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_TIME || '30m');
  if (m.loginMaxFailedLoginAttemptsTime === 0) {
    // Infinity is not used since new Date(Infinity) is invalid. The range of times supported by Date is smaller than range of Number.
    m.loginMaxFailedLoginAttemptsTime = ms('10000years');
  }
  m.loginMaxFailedLoginAttemptsCooldown = ms(process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN || '15m');
  m.loginMaxFailedLoginAttemptsLockoutMessage =
    process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_LOCKOUT_MESSAGE ||
    'This account was locked due to excessive number of incorrect logins. Please contact the system administrator in order to unlock the account.';
  m.loginMaxFailedLoginAttemptsCooldownMessage =
    process.env.LOGIN_MAX_FAILED_LOGIN_ATTEMPTS_COOLDOWN_MESSAGE ||
    'This account is temporarily disabled due to excessive number of invalid login attempts. Please try to login again later.';

  m.accountInactivityLockoutTime = ms(process.env.ACCOUNT_INACTIVITY_LOCKOUT_TIME || '90d');
  m.accountInactivityLockoutMessage =
    process.env.ACCOUNT_INACTIVITY_LOCKOUT_MESSAGE ||
    'This account is locked due to a long period of inactivity. Please contact the system administrator to unlock your account';

  const usersCollectionName = 'users';
  const User = db.collection(usersCollectionName);

  function getBasicLocalStrategy() {
    const strategyOptions = { usernameField: 'login', passwordField: 'password', passReqToCallback: true };

    return new LocalStrategy(strategyOptions, async (req, inputLogin, inputPassword, cb) => {
      try {
        const { record: user } = await User.hookQuery('findOne', {
          $or: [{ login: inputLogin }, { email: inputLogin }],
        });
        if (!user) {
          m.logAuthAudit({ message: `User attempted to login with incorrect login '${inputLogin}'`, req });
          return cb('Invalid login or password');
        }

        const { login, password } = user;
        const isMatched = await comparePassword(inputPassword, password);
        if (!isMatched) {
          m.logAuthAudit({ message: `User '${login}' attempted login with incorrect credentials`, req, user });
          return cb('Invalid login or password');
        }

        m.logAuthAudit({ message: `User '${login}' logged in`, req, user });
        return cb(null, user);
      } catch (e) {
        return cb(e);
      }
    });
  }

  function getInactivityLocalStrategy() {
    const strategyOptions = { usernameField: 'login', passwordField: 'password', passReqToCallback: true };

    return new LocalStrategy(strategyOptions, async (req, inputLogin, inputPassword, cb) => {
      try {
        const { record: user } = await User.hookQuery('findOne', {
          $or: [{ login: inputLogin }, { email: inputLogin }],
        });
        if (!user) {
          m.logAuthAudit({ message: `User attempted to login with incorrect login '${inputLogin}'`, req });
          return cb('Invalid login or password');
        }

        const { _id, disabledAt, login, lastLoginAt, accountInactivityLockedAt, loginCooldownAt, password } = user;
        if (disabledAt) {
          m.logAuthAudit({ message: `Disabled user '${login}' attempted to login`, req, user });
          return cb(m.loginMaxFailedLoginAttemptsLockoutMessage);
        }

        if (m.accountInactivityLockoutTime) {
          if (accountInactivityLockedAt) {
            m.logAuthAudit({ message: `Locked due to inactivity user '${login}' attempted to login`, req, user });
            return cb(m.accountInactivityLockoutMessage);
          }

          if (_.isDate(lastLoginAt)) {
            const now = new Date();
            const inactivityLockoutDate = new Date(lastLoginAt.getTime() + m.accountInactivityLockoutTime);
            if (now > inactivityLockoutDate) {
              await User.hookQuery('updateOne', { _id }, { $set: { accountInactivityLockedAt: now } });
              await appLib.cache.clearCacheForModel(usersCollectionName);
              m.logAuthAudit({
                message: `User '${login}' attempted to login, but this account is locked due to a long period of inactivity`,
                req,
                user,
              });
              return cb(m.accountInactivityLockoutMessage);
            }
          }
        }

        const currentLoginAttemptDate = new Date();
        if (loginCooldownAt >= currentLoginAttemptDate) {
          m.logAuthAudit({ message: `User on login cooldown '${login}' attempted to login`, req, user });
          return cb(m.loginMaxFailedLoginAttemptsCooldownMessage);
        }

        const isMatched = await comparePassword(inputPassword, password);
        if (isMatched) {
          await User.hookQuery(
            'updateOne',
            { _id },
            { $set: { lastLoginAt: currentLoginAttemptDate, failedLoginAttempts: [], loginCooldownAt: null } }
          );
          await appLib.cache.clearCacheForModel(usersCollectionName);
          m.logAuthAudit({ message: `User '${login}' logged in`, req, user });
          return cb(null, user);
        }

        let failedLoginAttempts = user.failedLoginAttempts || [];
        failedLoginAttempts.push(currentLoginAttemptDate);
        // save only allowed amount of failed login attempts + 1 to avoid bloating the array
        failedLoginAttempts = failedLoginAttempts.slice(-(m.loginMaxFailedLoginAttempts + 1));
        const isAccountOnLoginCooldown = getIsAccountOnLoginCooldown(failedLoginAttempts);
        if (!isAccountOnLoginCooldown) {
          await User.hookQuery('updateOne', { _id }, { $set: { failedLoginAttempts } });
          await appLib.cache.clearCacheForModel(usersCollectionName);
          m.logAuthAudit({ message: `User '${login}' attempted login with incorrect credentials`, req, user });
          return cb('Invalid login or password');
        }

        if (m.loginMaxFailedLoginAttemptsCooldown <= 0) {
          await User.hookQuery('updateOne', { _id }, { $set: { disabledAt: currentLoginAttemptDate } });
          await appLib.cache.clearCacheForModel(usersCollectionName);
          m.logAuthAudit({
            message: `User '${login}' attempted login with incorrect credentials. This account was locked due to excessive number of incorrect logins`,
            req,
            user,
          });
          return cb(m.loginMaxFailedLoginAttemptsLockoutMessage);
        }

        await User.hookQuery(
          'updateOne',
          { _id },
          {
            $set: {
              loginCooldownAt: new Date(currentLoginAttemptDate.getTime() + m.loginMaxFailedLoginAttemptsCooldown),
              failedLoginAttempts: [],
            },
          }
        );
        await appLib.cache.clearCacheForModel(usersCollectionName);
        m.logAuthAudit({
          message: `User '${login}' attempted login with incorrect credentials. This account is temporarily disabled due to excessive number of invalid login attempts`,
          req,
          user,
        });
        return cb(m.loginMaxFailedLoginAttemptsCooldownMessage);
      } catch (e) {
        return cb(e);
      }
    });
  }

  function getIsAccountOnLoginCooldown(loginAttempts) {
    if (loginAttempts.length <= m.loginMaxFailedLoginAttempts) {
      return false;
    }

    const indexOfFirstAttempt = loginAttempts.length - m.loginMaxFailedLoginAttempts;
    const firstLoginAttemptDate = loginAttempts[indexOfFirstAttempt];
    const lastLoginAttemptDate = _.last(loginAttempts);

    const isLastLoginWithinAttemptsTime =
      lastLoginAttemptDate <= new Date(firstLoginAttemptDate.getTime() + m.loginMaxFailedLoginAttemptsTime);
    return isLastLoginWithinAttemptsTime;
  }
  /**
   * Adds user authentication via passport.js
   */
  m.addUserAuthentication = (app) => {
    const localStrategy = m.loginMaxFailedLoginAttempts === 0 ? getBasicLocalStrategy() : getInactivityLocalStrategy();
    passport.use(localStrategy);

    passport.use(
      'jwt',
      new JwtStrategy(
        {
          jwtFromRequest: m.extractJwtFromRequest,
          secretOrKey: jwtSecret,
          passReqToCallback: true,
        },
        async (req, jwtPayload, done) => {
          try {
            const accessToken = m.extractJwtFromRequest(req);
            if (accessToken) {
              await m.checkAccessToken(accessToken);
            }

            const [{ record: user }] = await Promise.all([
              User.hookQuery('findOne', { _id: ObjectId(jwtPayload.id) }),
              m.prolongSession(accessToken),
            ]);
            return done(null, user);
          } catch (e) {
            done(e, null);
          }
        }
      )
    );

    passport.serializeUser((user, cb) => cb(null, user._id));
    passport.deserializeUser(async (id, cb) => {
      const { record: user } = await User.hookQuery('findOne', { _id: ObjectId(id) });
      if (user) {
        return cb(null, user);
      }
      return cb(new Error(`User with id ${id} is not found`));
    });
    app.use(passport.initialize());
  };

  /* eslint-disable promise/avoid-new, prefer-promise-reject-errors */
  m.authenticationCheck = (req) =>
    new Promise((resolve, reject) => {
      passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err instanceof InvalidTokenError) {
          m.logSecurityAudit({ message: `Request with invalid token`, req });
          return reject(err);
        }
        if (err instanceof ExpiredTokenError) {
          m.logSecurityAudit({ message: `Request with expired token`, req });
          return reject(err);
        }

        if (err) {
          return reject(new Error(`ERR: ${err.message}, INFO:${info}`));
        }

        const jwtErrorName = _.get(info, 'name');
        const isInvalidToken = jwtErrorName === 'JsonWebTokenError';
        if (isInvalidToken) {
          m.logSecurityAudit({ message: `Request with invalid token`, req });
          return reject(new InvalidTokenError());
        }

        const jwtMsg = _.get(info, 'message');
        const isForbiddenEmptyToken = jwtMsg === 'No auth token' && isRequiredAuth;
        if (isForbiddenEmptyToken) {
          m.logSecurityAudit({ message: `Request with invalid token`, req });
          return reject(new InvalidTokenError());
        }

        const isExpiredToken = jwtErrorName === 'TokenExpiredError';
        if (isExpiredToken) {
          m.logSecurityAudit({ message: `Request with expired token`, req });
          return reject(new ExpiredTokenError());
        }
        if (!info && !user) {
          // if token payload is valid but user is not found by that payload
          m.logSecurityAudit({ message: `Request with invalid token`, req });
          return reject(new InvalidTokenError());
        }

        return accessUtil.getRolesAndPermissionsForUser(user, req.device.type).then(({ roles, permissions }) => {
          resolve({ user, roles, permissions });
        });
      })(req);
    });
  /* eslint-enable promise/avoid-new, prefer-promise-reject-errors */

  m.isAuthenticated = (req, res, next) => {
    m.authenticationCheck(req)
      .then(({ user, roles, permissions }) => {
        accessUtil.setReqAuth({ req, user, roles, permissions });
        const store = asyncLocalStorage.getStore();
        if (!store) {
          log.error(`Unable to get als store`, req);
        } else {
          store.user = _.pick(user, ['login', 'email', '_id']);
        }
        next();
      })
      .catch(InvalidTokenError, () => {
        res.status(401).json({ success: false, message: 'Invalid user session, please login' });
      })
      .catch(ExpiredTokenError, () => {
        res.status(401).json({ success: false, message: 'User session expired, please login again' });
      })
      .catch((err) => {
        log.error(err.stack);
        res.status(500).json({ success: false, message: `Error occurred during authentication process` });
      });
  };

  m.createTokensRecord = async (userId, login) => {
    const tokensRecord = {
      refreshToken: m.getRefreshToken(),
      refreshTokenExpire: m.getExpiryDate(m.refreshTokenExpiresInMs),
      accessToken: m.createAccessToken(userId),
      accessTokenExpire: m.getExpiryDate(m.accessTokenExpiresInMs),
      userId,
      login,
    };
    if (m.isInactivityLogoutEnabled) {
      tokensRecord.sessionExpire = m.getExpiryDate(m.inactivityLogoutMs);
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
    if (m.isInactivityLogoutEnabled && sessionExpire < Date.now()) {
      throw new ExpiredTokenError('Session expired');
    }

    const update = {
      refreshToken: m.getRefreshToken(),
      refreshTokenExpire: m.getExpiryDate(m.refreshTokenExpiresInMs),
      accessToken: m.createAccessToken(userId),
      accessTokenExpire: m.getExpiryDate(m.accessTokenExpiresInMs),
      previousAccessToken: oldAccessToken,
    };
    if (m.isInactivityLogoutEnabled) {
      update.sessionExpire = silent ? sessionExpire : m.getExpiryDate(m.inactivityLogoutMs);
    }

    const { record: newRecord } = await Tokens.hookQuery(
      'findOneAndUpdate',
      { refreshToken: { $eq: refreshToken } },
      { $set: update },
      { returnOriginal: false, checkKeys: false }
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
    if (m.isInactivityLogoutEnabled && record.sessionExpire < Date.now()) {
      throw new ExpiredTokenError();
    }
    return record;
  };

  m.prolongSession = async (accessToken) => {
    if (!m.isInactivityLogoutEnabled) {
      return null;
    }

    const sessionExpire = m.getExpiryDate(m.inactivityLogoutMs);
    const { record } = await Tokens.hookQuery(
      'findOneAndUpdate',
      {
        $or: [{ accessToken: { $eq: accessToken } }, { previousAccessToken: { $eq: accessToken } }],
        sessionExpire: { $gte: new Date() },
      },
      { $set: { sessionExpire } },
      { returnOriginal: false, checkKeys: false }
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
