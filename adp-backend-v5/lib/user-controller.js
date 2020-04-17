/**
 * Implement user authentication and authorization
 * @returns {{}}
 */
const log = require('log4js').getLogger('lib/user-controller');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { ObjectID } = require('mongodb');
const _ = require('lodash');
const ms = require('ms');
const Promise = require('bluebird');
const {
  getResetToken,
  getResetTokenExpiresIn,
  getSuccessfulPasswordResetMail,
  getForgotPasswordMail,
  sendMail,
} = require('./user-auth-service');
const { getMongoDuplicateErrorMessage } = require('./util/util');

const User = mongoose.model('users');
const { LinkedRecordError, InvalidTokenError, ExpiredTokenError, ValidationError } = require('./errors');

const TOKEN_EXPIRES_IN = process.env.TOKEN_EXPIRES_IN || '1d';

module.exports = (appLib) => {
  const { transformers } = appLib;

  const m = {};
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

    appLib.addRoute('get', '/logout', [m.logout]);
    /**
     * @swagger
     * /logout:
     *   get:
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
    passport.authenticate('local', (err, user) => {
      if (err || !user) {
        err && log.error(err);
        req.loginData = { success: false, message: 'Invalid credentials.' };
        return next();
      }
      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }

        try {
          const token = jwt.sign(
            {
              id: user._id,
              email: user.email,
            },
            process.env.JWT_SECRET,
            { expiresIn: TOKEN_EXPIRES_IN } // set expiresIn value to make it expired
          );

          const existingUser = await User.findById(user._id);
          if (!existingUser) {
            log.error(`User not found: ${user}`);
            req.loginData = { success: false, message: `User not found` };
            return next();
          }

          const linkedRecords = _(appLib.appModel.models.users.fields)
            .map((val, key) => ({ key, lookup: val.lookup, required: val.required }))
            .filter((val) => val.lookup && val.required)
            .keyBy('key')
            .mapValues((val) => existingUser[val.key])
            .value();

          const userData = _.merge(linkedRecords, {
            id: user._id,
            login: user.login,
          });
          const expiresIn = new Date(Date.now() + ms(TOKEN_EXPIRES_IN));
          req.loginData = { success: true, data: { token, expiresIn, user: userData } };
          next();
        } catch (e) {
          log.error(`Unable to find user: ${e}`);
          req.loginData = { success: false, message: 'Unable to find user' };
          return next();
        }
      });
    })(req, res, next);
  };

  m.postLoginResponse = (req, res) => {
    const loginData = _.get(req, 'loginData', {});
    if (loginData.success) {
      return res.json(loginData);
    }
    return res.status(401).json(loginData);
  };

  m.logout = (req, res) => {
    req.logout();
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
    const LinkedModel = mongoose.model(tableName);
    if (!LinkedModel) {
      throw LinkedRecordError(`Linked table ${tableName} not found`);
    }

    try {
      const linkedRecord = new LinkedModel({});
      await transformers.preSaveTransformData(tableName, userContext, linkedRecord, []);
      const data = await linkedRecord.save();
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

    try {
      await transformers.preSaveTransformData('users', userContext, req.body, []);
    } catch (e) {
      return res.status(422).json({ success: false, message: e.message });
    }

    // check if user already exists
    const { login, email } = req.body;
    const existingUser = await User.findOne({ login });
    if (existingUser) {
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
      const userData = _.merge(linkedRecords, {
        ...req.body,
        _id: userDocObjectId,
        password: req.body.password,
      });
      // remove recaptcha and other non-model fields
      const strictUser = new User(userData, true);
      const createdUser = await strictUser.save();

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
    // validate user input
    try {
      const userContext = appLib.accessUtil.getUserContext(req);
      await transformers.preSaveTransformData('users', userContext, req.body, ['password']);
    } catch (e) {
      return res.status(422).json({ success: false, message: e.message });
    }

    try {
      const userId = _.get(req, 'user.id');
      const user = await User.findById(userId);
      if (!user) {
        res.json({ success: false, message: `Unable to find account with by user id ${userId}.` });
      }
      // update password
      user.password = req.body.password;
      const updatedUser = user.save();
      res.json({
        success: true,
        message: 'User password was successfully updated',
        id: updatedUser._id,
      });
    } catch (e) {
      log.error(e);
      res.status(500).json({ success: false, message: `Unable to update user password` });
    }
  };

  /**
   * POST /account/delete
   * Delete user account.
   */
  /*
   m.postDeleteAccount = (req, res, next) => {
   User.remove({_id: req.user.id}, (err) => {
   if (err) {
   return next(err);
   }
   req.logout();
   });
   };
   */

  /**
   * Process the reset password request.
   */
  m.postReset = async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token) {
        return res.json({ success: false, message: 'Password reset token must be specified.' });
      }

      const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } }).lean();
      if (!user) {
        return res.json({ success: false, message: 'Password reset token is invalid or has expired.' });
      }

      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      const userContext = appLib.accessUtil.getUserContext(req);
      await transformers.preSaveTransformData('users', userContext, user, []);
      await User.replaceOne({ _id: user._id }, user);

      const { email } = user;
      const successfulPasswordResetMail = getSuccessfulPasswordResetMail(email);
      await sendMail(successfulPasswordResetMail);
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
      if (!email) {
        return res.json({ success: false, message: `Parameter 'email' must be set in request body.` });
      }

      const user = await User.findOne({ email }).lean();
      if (!user) {
        return res.json({ success: false, message: `Account with email address ${email} does not exist.` });
      }

      user.resetPasswordToken = getResetToken();
      user.resetPasswordExpires = new Date(Date.now() + getResetTokenExpiresIn());
      await User.replaceOne({ _id: user._id }, user);

      const forgotPasswordMail = getForgotPasswordMail(email, user.resetPasswordToken, user.login);
      await sendMail(forgotPasswordMail);
      res.json({ success: true, message: `An e-mail has been sent to ${email} with further instructions.` });
    } catch (e) {
      log.error(`Something went wrong while handling forgot password`, e.stack);
      res.json({ success: false, message: `Something went wrong, try again later or contact support.` });
    }
  };

  m.init(appLib);

  return m;
};
