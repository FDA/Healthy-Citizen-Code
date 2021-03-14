/**
 * Implement user authentication and authorization
 * @returns {{}}
 */
const log = require('log4js').getLogger('lib/user-controller');
const passport = require('passport');
const ms = require('ms');
const { ObjectID } = require('mongodb');
const _ = require('lodash');
const mem = require('mem');
const Promise = require('bluebird');

const { sendMail, getForgotPasswordMail, getSuccessfulPasswordResetMail } = require('../../lib/mail');
const { getMongoDuplicateErrorMessage } = require('../../lib/util/util');
const { getCookie } = require('../../lib/util/cookie');

module.exports = (appLib) => {
  const m = {};

  const User = appLib.db.collection('users');
  const { transformers } = appLib;
  const { LinkedRecordError, InvalidTokenError, ExpiredTokenError, ValidationError } = appLib.errors;
  const {
    extractJwtFromRequest,
    getExpiryDate,
    resetPasswordTokenExpiresInMs,
    getResetToken,
    refreshTokenCookieName,
    setRefreshTokenCookie,
    refreshTokensRecord,
    createTokensRecord,
    removeTokensRecord,
    updateSocketAccessToken,
    isInactivityLogoutEnabled,
    getTokensRecord,
    prolongSession,
  } = appLib.auth;

  m.appLib = appLib;

  m.addAuthRoutes = function () {
    appLib.addRoute('post', '/login', [m.postLogin, m.postLoginResponse]);
    /**
     * @swagger
     * /login:
     *   post:
     *     summary: Login user
     *     tags:
     *       - Auth
     *     parameters:
     *      -  in: 'body'
     *         name: loginData
     *         required: true
     *         schema:
     *           type: object
     *           required:
     *             - login
     *             - password
     *           properties:
     *             login:
     *               type: string
     *               unique: true
     *             password:
     *               type: string
     *               format: password
     *     responses:
     *       200:
     *         description: Successful login
     *         schema:
     *           type: object
     *           properties:
     *             data:
     *               type: object
     *               properties:
     *                 token:
     *                   type: string
     *                   desciption: JWT token
     *                 user:
     *                   type: object
     *                   properties:
     *                     id:
     *                       type: string
     *                       description: user id
     *                     login:
     *                       type: string
     *             success:
     *               type: boolean
     */

    appLib.addRoute('post', '/logout', [m.logout]);
    /**
     * @swagger
     * /logout:
     *   post:
     *     summary: Logout user
     *     tags:
     *       - Auth
     *     responses:
     *       200:
     *         description: Success
     */

    appLib.addRoute('post', '/signup', [m.postSignup]);
    /**
     * @swagger
     * /signup:
     *   post:
     *     summary: Login user
     *     tags:
     *       - Auth
     *     parameters:
     *       -  in: 'body'
     *          name: signupData
     *          required: true
     *          schema:
     *           type: object
     *           required:
     *             - login
     *             - email
     *             - password
     *           properties:
     *             login:
     *               type: string
     *               unique: true
     *             email:
     *               type: string
     *             password:
     *               type: string
     *               format: password
     *     responses:
     *       200:
     *         description: Successfully created new user
     *         schema:
     *           type: object
     *           properties:
     *             data:
     *               type: object
     *               properties:
     *                 id:
     *                   type: string
     *                   description: user id
     *                 login:
     *                   type: string
     *             success:
     *               type: boolean
     *             message:
     *               type: string
     *               description: message to user
     */

    appLib.addRoute('post', '/account/password', [m.appLib.isAuthenticated, m.postUpdatePassword]);
    appLib.addRoute('post', '/forgot', [m.postForgot]);
    /**
     * @swagger
     * /forgot:
     *   post:
     *     summary: Creates a random token and sends user an email with a reset link.
     *     description: Sent email contains a link in format 'RESET_PASSWORD_URL?token=${token}'. Reuse this token for /reset.
     *     tags:
     *       - Auth
     *     parameters:
     *       -  in: 'body'
     *          name: body
     *          required: true
     *          schema:
     *           type: object
     *           required:
     *             - email
     *           properties:
     *             email:
     *               type: string
     *     responses:
     *       200:
     *         description: Indicates whether an email with token successfully sent or error occurred.
     *         schema:
     *           type: object
     *           properties:
     *             success:
     *               type: boolean
     *             message:
     *               type: string
     *               description: message to user
     */

    appLib.addRoute('post', '/reset', [m.postReset]);
    /**
     * @swagger
     * /reset:
     *   post:
     *     summary: Resets password to that, which specified in body and sends an email. Requires reset token.
     *     tags:
     *       - Auth
     *     parameters:
     *       -  in: 'body'
     *          name: body
     *          required: true
     *          schema:
     *           type: object
     *           required:
     *             - token
     *             - password
     *           properties:
     *             token:
     *               type: string
     *             password:
     *               type: string
     *               format: password
     *     responses:
     *       200:
     *         description: Indicates token and password correctness, email sent or not.
     *         schema:
     *           type: object
     *           properties:
     *             success:
     *               type: boolean
     *             message:
     *               type: string
     *               description: message to user
     */

    // appLib.addRoute('post', '/account/delete', [m.appLib.isAuthenticated, m.postDeleteAccount]);
    appLib.addRoute('post', '/refresh-token', [m.refreshToken]);
    if (isInactivityLogoutEnabled) {
      appLib.addRoute('post', '/session-status', [m.sessionStatus]);
      appLib.addRoute('post', '/prolong-session', [m.prolongSession]);
    }
  };

  m.init = () => {
    log.trace('Adding custom routes for User controller');
    if (appLib.getAuthSettings().enableAuthentication !== false) {
      m.addAuthRoutes();
    }
  };

  /**
   * POST /login
   * Sign in using email and password.
   */
  m.postLogin = (req, res, next) => {
    passport.authenticate('local', async (err, user) => {
      if (err || !user) {
        err && log.error(err);
        req.loginData = { success: false, message: err || 'Invalid credentials.' };
        return next();
      }

      try {
        const { record } = await User.hookQuery('findOne', { _id: ObjectID(user._id) });
        if (!record) {
          log.error(`User not found: ${user}`);
          req.loginData = { success: false, message: `User not found` };
          return next();
        }

        const linkedRecords = _(appLib.appModel.models.users.fields)
          .map((val, key) => ({ key, lookup: val.lookup, required: val.required }))
          .filter((val) => val.lookup && val.required)
          .keyBy('key')
          .mapValues((val) => record[val.key])
          .value();

        const { _id, login } = user;
        const userData = _.merge(linkedRecords, {
          id: _id,
          login,
          avatar: _.get(user, 'avatar.0', {}),
        });

        const tokensRecord = await createTokensRecord(_id, login);
        const { refreshToken, accessToken, accessTokenExpire } = tokensRecord;

        setRefreshTokenCookie(res, refreshToken);
        req.loginData = { success: true, data: { token: accessToken, expiresIn: accessTokenExpire, user: userData } };
        next();
      } catch (e) {
        log.error(`Unable to find user`, e.stack);
        req.loginData = { success: false, message: 'Unable to find user' };
        return next();
      }
    })(req, res, next);
  };

  m.postLoginResponse = (req, res) => {
    const loginData = _.get(req, 'loginData', {});
    if (loginData.success) {
      // pass user for logs
      req.user = loginData.user;

      return res.json(loginData);
    }
    return res.status(401).json(loginData);
  };

  m.logout = async (req, res) => {
    const refreshToken = getCookie(req, refreshTokenCookieName);
    if (!refreshToken) {
      return res.json({ success: false, message: 'There is no refresh token presented.' });
    }
    res.clearCookie(refreshTokenCookieName);

    const record = await removeTokensRecord({ refreshToken });
    if (!record) {
      return res.json({ success: false, message: 'Invalid refresh token presented' });
    }
    const { accessToken, login, userId } = record;
    m.appLib.ws.sendRequest('emitToSockets', {
      data: { type: 'logoutNotification', level: 'info' },
      socketFilter: `return socket.accessToken === this.accessToken;`,
      context: { accessToken },
    });

    m.appLib.auth.logAuthAudit({ message: `User '${login}' logged out`, req, user: { _id: userId, login } });
    res.json({ success: true, message: 'User has been logged out' });
  };

  async function handleLinkedRecordField(key, fieldSpec, userContext, linkedRecordsStorage) {
    const tableLookups = Object.values(fieldSpec.lookup.table);
    if (tableLookups.length !== 1) {
      throw LinkedRecordError(
        `Required table lookups must contain only 1 lookup. Specified lookup contains more: ${fieldSpec.lookup}`
      );
    }
    const tableLookup = tableLookups[0];
    const tableName = tableLookup.table;
    if (!m.appLib.appModel.models[tableName]) {
      throw LinkedRecordError(`Linked table ${tableName} not found`);
    }

    try {
      const linkedRecord = {};
      await transformers.preSaveTransformData(tableName, userContext, linkedRecord, []);
      const { record: data } = await m.appLib.db
        .collection(tableName)
        .hookQuery('insertOne', linkedRecord, { checkKeys: false });
      linkedRecordsStorage[key] = data._id;
    } catch (e) {
      throw LinkedRecordError(`Error occurred while creating linked record for ${tableName}`);
    }
  }

  m.postSignup = async (req, res, next) => {
    const {
      getUserContext,
      getRolesAndPermissionsForUser,
      setReqRoles,
      setReqPermissions,
      getReqPermissions,
    } = appLib.accessUtil;

    const linkedRecords = {};
    // need to pregenerate user doc object id to be able to set it in dependent fields like 'creator'
    const userDocObjectId = new ObjectID();
    const userContext = getUserContext(req);
    _.set(userContext, 'user._id', userDocObjectId);

    try {
      const { user, roles, permissions } = await appLib.authenticationCheck(req, res, next);
      appLib.accessUtil.setReqAuth({ req, user, roles, permissions });
    } catch (e) {
      if (e instanceof InvalidTokenError || e instanceof ExpiredTokenError) {
        // get guest permissions anyway
        const { roles, permissions } = await getRolesAndPermissionsForUser(null, req.device.type);
        setReqRoles(req, roles);
        setReqPermissions(req, permissions);
      }
    }

    const userPermissions = getReqPermissions(req);
    if (!userPermissions.has(m.appLib.accessCfg.PERMISSIONS.createUserAccounts)) {
      return res.status(403).json({ success: false, message: `Not authorized to signup` });
    }

    const signupFields = _.pick(req.body, ['login', 'email', 'password']);
    try {
      await transformers.preSaveTransformData('users', userContext, signupFields, []);
    } catch (e) {
      return res.status(422).json({ success: false, message: e.message });
    }

    // check if user already exists
    const { login, email } = signupFields;
    const { record } = await User.hookQuery('findOne', { login: { $eq: login } });
    if (record) {
      return res.status(409).json({ success: false, message: `User ${login} already exists` });
    }

    try {
      // TODO: run this recursively so if any n-level collections are also required then create them as well
      // TODO: write tests for this
      // TODO: turn on auto-generator for values
      // create all dependant collections (1 level only)
      const linkedRecordsFields = Object.entries(appLib.appModel.models.users.fields).filter(
        ([, fieldSpec]) => fieldSpec.lookup && fieldSpec.required
      );
      await Promise.map(linkedRecordsFields, ([key, fieldSpec]) =>
        handleLinkedRecordField(key, fieldSpec, userContext, linkedRecords)
      );
    } catch (e) {
      if (e instanceof LinkedRecordError) {
        res.status(409).json({ success: false, message: e.message });
      }
      log.error(e);
      res.status(500).json({ success: false, message: e });
    }

    try {
      // create user record
      const userData = _.merge(linkedRecords, { ...signupFields, _id: userDocObjectId });
      // remove recaptcha and other non-model fields
      // TODO: UNI-732 add strict validation
      // const strictUser = new User(userData, true);
      // const createdUser = await strictUser.save();

      const { record: createdUser } = await User.hookQuery('insertOne', userData, { checkKeys: false });

      res.json({
        success: true,
        message: 'Account has been successfully created',
        data: { id: createdUser._id, login, email },
      });
    } catch (e) {
      const duplicateErrMsg = getMongoDuplicateErrorMessage(e, appLib.appModel.models);
      if (duplicateErrMsg) {
        log.info(duplicateErrMsg);
        return res.status(409).json({ success: false, message: duplicateErrMsg });
      }
      log.error(e.stack);
      res.status(400).json({ success: false, message: 'Unable to signup' });
    }
  };

  /**
   * Update current password.
   */
  m.postUpdatePassword = async (req, res) => {
    const userId = _.get(req, 'user.id');
    if (!ObjectID.isValid(userId)) {
      return res.json({ success: false, message: `Invalid user id specified.` });
    }

    const userData = req.body;
    try {
      // validate user input
      const userContext = appLib.accessUtil.getUserContext(req);
      await transformers.preSaveTransformData('users', userContext, userData, ['password']);
    } catch (e) {
      return res.status(422).json({ success: false, message: e.message });
    }

    try {
      const conditions = { _id: ObjectID(userId) };
      const { record: user } = await User.hookQuery('findOne', conditions, { _id: 1 });
      if (!user) {
        return res.json({ success: false, message: `Unable to find account with by user id ${userId}.` });
      }
      // update password
      await User.hookQuery('updateOne', conditions, { $set: { password: userData.password } }, { checkKeys: false });

      m.appLib.auth.logAuthAudit({ message: `User '${req.user.login}' changed password`, req, user: req.user });
      res.json({
        success: true,
        message: 'User password was successfully updated',
        id: userId,
      });
    } catch (e) {
      log.error(e);
      res.status(500).json({ success: false, message: `Unable to update user password` });
    }
  };

  /**
   * Process the reset password request.
   */
  m.postReset = async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!_.isString(token)) {
        return res.json({ success: false, message: 'Password reset token must be specified.' });
      }

      const { record: user } = await User.hookQuery('findOne', {
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });
      if (!user) {
        return res.json({ success: false, message: 'Password reset token is invalid or has expired.' });
      }

      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      const userContext = appLib.accessUtil.getUserContext(req);
      await transformers.preSaveTransformData('users', userContext, user, []);
      await User.hookQuery('replaceOne', { _id: user._id }, user, { checkKeys: false });

      const { email } = user;
      const successfulPasswordResetMail = getSuccessfulPasswordResetMail(email);
      await sendMail(successfulPasswordResetMail);

      m.appLib.auth.logAuthAudit({ message: `User '${user.login}' changed password`, req, user });
      res.json({ success: true, message: `The password for your account ${email} has just been changed.` });
    } catch (e) {
      if (e instanceof ValidationError) {
        return res.json({ success: false, message: e.message });
      }
      log.error(`Something went wrong while resetting password`, e.stack);
      res.json({ success: false, message: `Something went wrong, try again later or contact support.` });
    }
  };

  /**
   * Create a random token, then send user an email with a reset link.
   */
  m.postForgot = async (req, res) => {
    try {
      const { email } = req.body;
      if (!_.isString(email)) {
        return res.json({ success: false, message: `Parameter 'email' must be set in request body.` });
      }

      const user = await User.hookQuery('findOne', { email });
      if (!user) {
        return res.json({ success: false, message: `Account with email address ${email} does not exist.` });
      }

      user.resetPasswordToken = getResetToken();
      user.resetPasswordExpires = getExpiryDate(resetPasswordTokenExpiresInMs);
      await User.replaceOne({ _id: user._id }, user);

      const forgotPasswordMail = getForgotPasswordMail(email, user.resetPasswordToken, user.login);
      await sendMail(forgotPasswordMail);
      res.json({ success: true, message: `An e-mail has been sent to ${email} with further instructions.` });
    } catch (e) {
      log.error(`Something went wrong while handling forgot password`, e.stack);
      res.json({ success: false, message: `Something went wrong, try again later or contact support.` });
    }
  };

  function refreshTokenFunc(currentRefreshToken, silent) {
    if (!currentRefreshToken) {
      return {
        status: 401,
        response: {
          success: false,
          message: `There is no refresh token presented.`,
        },
      };
    }

    return Promise.resolve(refreshTokensRecord(currentRefreshToken, silent))
      .then(({ newRecord, oldRecord }) => {
        const { accessToken, refreshToken, accessTokenExpire, userId, login } = newRecord;
        updateSocketAccessToken(oldRecord.accessToken, accessToken);

        return {
          user: { _id: userId, login },
          status: 200,
          refreshToken,
          response: { success: true, token: accessToken, expiresIn: accessTokenExpire },
        };
      })
      .catch(InvalidTokenError, ExpiredTokenError, (e) => {
        return { status: 401, response: { success: false, message: e.message } };
      })
      .catch((e) => {
        const message = 'Unable to refresh token';
        log.error(message, e.stack);
        return { status: 401, response: { success: false, message } };
      });
  }
  const memoizedRefreshTokenFunc = mem(refreshTokenFunc, {
    cacheKey: (args) => args.join(','),
    maxAge: ms(process.env.INACTIVITY_LOGOUT_REMEMBER_OLD_TOKEN_FOR || 10000),
  });

  m.refreshToken = async (req, res) => {
    const currentRefreshToken = getCookie(req, refreshTokenCookieName);
    const silent = req.query.silent === 'true';

    const { status, refreshToken, response, user } = await memoizedRefreshTokenFunc(currentRefreshToken, silent);
    // pass user for logs
    req.user = user;

    if (refreshToken) {
      setRefreshTokenCookie(res, refreshToken);
    }
    return res.status(status).json(response);
  };

  m.sessionStatus = async (req, res) => {
    try {
      const accessToken = extractJwtFromRequest(req);
      if (!accessToken) {
        return res.json({ success: false, message: `There is no access token presented.` });
      }

      const record = await getTokensRecord(accessToken);
      if (!record) {
        return res.json({ success: false, message: 'There is no session associated with token presented.' });
      }
      const { userId, login, sessionExpire } = record;
      // pass user for logs
      req.user = { _id: userId, login };

      const sessionEndMs = sessionExpire - Date.now();
      return res.json({ success: true, data: { sessionEndMs, isExpired: sessionEndMs <= 0 } });
    } catch (e) {
      return res.json({ success: false, message: 'Unable to retrieve session status.' });
    }
  };

  m.prolongSession = async (req, res) => {
    try {
      const accessToken = extractJwtFromRequest(req);
      if (!accessToken) {
        return res.json({ success: false, message: `There is no access token presented.` });
      }

      const sessionExpireDate = await prolongSession(accessToken);
      if (!sessionExpireDate) {
        return res.json({ success: false, message: 'There is no session associated with token presented.' });
      }
      return res.json({ success: true, data: { sessionEndMs: sessionExpireDate - Date.now() } });
    } catch (e) {
      if (e instanceof InvalidTokenError) {
        return res.json({ success: false, message: e.message });
      }
      return res.json({ success: false, message: 'Unable to prolong session.' });
    }
  };

  return m;
};
