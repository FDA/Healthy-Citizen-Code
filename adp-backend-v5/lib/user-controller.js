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

const User = mongoose.model('users');

module.exports = appLib => {
  const transformers = require('./transformers')(appLib);

  const m = {};
  m.appLib = appLib;

  m.addAuthRoutes = function() {
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
    // appLib.addRoute('get', '/forgot', [m.getForgot]);
    // appLib.addRoute('post', '/forgot', [m.postForgot]);
    // appLib.addRoute('get', '/reset/:  token', [m.getReset]);
    // appLib.addRoute('post', '/reset/:token', [m.postReset]);
    // appLib.addRoute('post', '/account/delete', [m.appLib.isAuthenticated, m.postDeleteAccount]);
  };

  m.init = () => {
    log.trace('Adding custom routes for User controller');
    if (appLib.getAuthSettings().enableAuthentication !== false) {
      m.addAuthRoutes();
    }

    // delete /piis and /phis routes
    // _.each(m.appLib.app.router.mounts, (route, key) => {
    //   if (route.spec.method === 'GET' && ((route.spec.path === '/phis' || (route.spec.path === '/piis')))) {
    //     m.appLib.app.rm(key);
    //   }
    // });
  };

  /**
   * POST /login
   * Sign in using email and password.
   */
  m.postLogin = (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        return next(`ERR: ${err} INFO:${info}`);
      }
      if (!user) {
        req.loginData = { success: false, message: 'Invalid credentials.' };
        return next();
      }
      req.logIn(user, loginErr => {
        if (loginErr) {
          return next(loginErr);
        }

        const token = jwt.sign(
          {
            id: user._id,
            email: user.email,
          },
          process.env.JWT_SECRET
          // {expiresIn: '1d'}, // set expiresIn value to make it expired
        );

        User.findById(user._id, (userErr, existingUser) => {
          if (userErr) {
            log.error(`Error finding user: ${userErr}`);
            req.loginData = { success: false, message: 'Error finding user' };
            return next();
          }
          if (!existingUser) {
            log.error(`Unable to find user: ${user}`);
            req.loginData = { success: false, message: `Unable to find user` };
            return next();
          }

          const linkedRecords = _(appLib.appModel.models.users.fields)
            .map((val, key) => ({ key, lookup: val.lookup, required: val.required }))
            .filter(val => val.lookup && val.required)
            .keyBy('key')
            .mapValues(val => existingUser[val.key])
            .value();

          const userData = _.merge(linkedRecords, {
            id: user._id,
            login: user.login,
          });
          req.loginData = { success: true, data: { token, user: userData } };
          next();
        });
      });
    })(req, res, next);
  };

  m.postLoginResponse = (req, res) => {
    const loginData = _.get(req, 'loginData', {});
    if (loginData.success) {
      return res.json(loginData);
    }
    return res.json(401, loginData);
  };

  m.logout = (req, res) => {
    req.logout();
    res.json({ success: true, message: 'User has been logged out' });
  };

  const userRegisterPromisified = Promise.promisify(User.register, { context: User });

  function handleLinkedRecordField(key, fieldSpec, userContext, linkedRecordsStorage) {
    const tableLookups = Object.values(fieldSpec.lookup.table);
    if (tableLookups.length !== 1) {
      throw `Required table lookups must contain only 1 lookup. ` +
        `Specified lookup contains more: ${fieldSpec.lookup}`;
    }
    const tableLookup = tableLookups[0];
    const tableName = tableLookup.table;
    const LinkedModel = mongoose.model(tableName);
    if (!LinkedModel) {
      throw `Linked table ${tableName} not found`;
    }

    const linkedRecord = new LinkedModel({});
    return transformers
      .preSaveTransformData(tableName, userContext, linkedRecord, [])
      .then(() => linkedRecord.save())
      .then(data => {
        linkedRecordsStorage[key] = data._id;
      })
      .catch(() => {
        throw `Error occurred while creating linked record for ${tableName}`;
      });
  }
  // TODO: Customize this, not all users will have PHI date (and possibly not even PII)
  m.postSignup = (req, res, next) => {
    const linkedRecords = {};

    // need to pregenerate user doc object id to be able to set it in dependent fields like 'creator'
    const userDocObjectId = new ObjectID();
    const userContext = appLib.accessUtil.getUserContext(req);
    _.set(userContext, 'user._id', userDocObjectId);

    appLib
      .authenticationCheck(req, res, next)
      .then(({ user, permissions }) => {
        req.user = user;
        appLib.accessUtil.setUserPermissions(req, permissions);
      })
      .catch({ code: 401 }, () => {
        // get guest permissions anyway
        const permissions = appLib.accessUtil.getPermissionsForUser(null, req.device.type);
        appLib.accessUtil.setUserPermissions(req, permissions);
      })
      .then(() => {
        const userPermissions = appLib.accessUtil.getUserPermissions(req);
        if (!userPermissions.has(m.appLib.accessCfg.PERMISSIONS.createUserAccounts)) {
          throw {
            code: 'CanNotCreateUserAccounts',
            success: false,
            message: `Not authorized to signup`,
          };
        }

        return transformers.preSaveTransformData('users', userContext, req.body, []);
      })
      .catch(err => {
        throw {
          code: 'TransformError',
          message: err.message,
        };
      })
      .then(() =>
        // check if user already exists
        User.findOne({ login: req.body.login })
      )
      .then(existingUser => {
        if (existingUser) {
          throw `User ${req.body.login} already exists`;
        }
        // TODO: run this recursively so if any n-level collections are also required then create them as well
        // TODO: write tests for this
        // TODO: turn on auto-generator for values
        // create all dependant collections (1 level only)
        const linkedRecordsFields = Object.entries(appLib.appModel.models.users.fields).filter(
          ([, fieldSpec]) => fieldSpec.lookup && fieldSpec.required
        );
        return Promise.map(linkedRecordsFields, ([key, fieldSpec]) =>
          handleLinkedRecordField(key, fieldSpec, userContext, linkedRecords)
        );
      })
      .then(() => {
        // create user record
        const userData = _.merge(linkedRecords, {
          ...req.body,
          _id: userDocObjectId,
        });
        // remove recaptcha and other non-model fields
        const strictUser = new User(userData, true);
        return userRegisterPromisified(strictUser, strictUser.password);
      })
      .then(createdUser => {
        res.json({
          success: true,
          message: 'Account had been successfully created',
          // id: createdUser._id, // TODO: drop it, it's in the data
          data: _.merge(linkedRecords, {
            id: createdUser._id,
            login: req.body.login,
          }),
        });
      })
      .catch({ code: 'CanNotCreateUserAccounts' }, err => {
        res.json(403, { success: err.success, message: err.message });
      })
      .catch({ code: 'TransformError' }, err => {
        res.json(400, { success: false, message: err.message });
      })
      .catch(err => {
        log.error(err);
        if (err instanceof Error) {
          return res.json(400, { success: false, message: 'Unable to create user' });
        }
        res.json(400, { success: false, message: err });
      });
  };

  /**
   * POST /account/password
   * Update current password.
   * TODO: test this method
   */
  m.postUpdatePassword = (req, res) => {
    // TODO: move into appModel validation
    // password regexp: http://stackoverflow.com/questions/23699919/regular-expression-for-password-complexity
    let userFound;
    // validate user input
    const userContext = appLib.accessUtil.getUserContext(req);
    return transformers
      .preSaveTransformData('users', userContext, req.body, ['password'])
      .then(() => User.findById(_.get(req, 'user.id')))
      .then(user => {
        if (!user) {
          throw new Error(`User was not found.`);
        }
        userFound = user;
      })
      .then(() => {
        // update password
        userFound.password = req.body.password;
        return userFound.save();
      })
      .then(updatedUser => {
        res.json({
          success: true,
          message: 'User password was successfully updated',
          id: updatedUser._id,
        });
      })
      .catch(err => {
        log.error(err);
        res.json(400, { success: false, message: `Unable to update user password` });
      });
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
   * GET /reset/:token
   * Reset Password page.
   */
  /* TODO: later
   m.getReset = (req, res, next) => {
   if (req.isAuthenticated()) {
   return res.redirect('/');
   }
   User
   .findOne({passwordResetToken: req.params.token})
   .where('passwordResetExpires').gt(Date.now())
   .exec((err, user) => {
   if (err) {
   return next(err);
   }
   if (!user) {
   req.flash('errors', {msg: 'Password reset token is invalid or has expired.'});
   return res.redirect('/forgot');
   }
   res.render('account/reset', {
   title: 'Password Reset'
   });
   });
   };
   */

  /**
   * POST /reset/:token
   * Process the reset password request.
   */
  /* TODO: later
   m.postReset = (req, res, next) => {
   req.assert('password', 'Password must be at least 4 characters long.').len(4);
   req.assert('confirm', 'Passwords must match.').equals(req.body.password);

   const errors = req.validationErrors();

   if (errors) {
   req.flash('errors', errors);
   return res.redirect('back');
   }

   async.waterfall([
   function (done) {
   User
   .findOne({passwordResetToken: req.params.token})
   .where('passwordResetExpires').gt(Date.now())
   .exec((err, user) => {
   if (err) {
   return next(err);
   }
   if (!user) {
   req.flash('errors', {msg: 'Password reset token is invalid or has expired.'});
   return res.redirect('back');
   }
   user.password = req.body.password;
   user.passwordResetToken = undefined;
   user.passwordResetExpires = undefined;
   user.save((err) => {
   if (err) {
   return next(err);
   }
   req.logIn(user, (err) => {
   done(err, user);
   });
   });
   });
   },
   function (user, done) {
   const transporter = nodemailer.createTransport({
   service: 'SendGrid',
   auth: {
   user: process.env.SENDGRID_USER,
   pass: process.env.SENDGRID_PASSWORD
   }
   });
   const mailOptions = {
   to: user.email,
   from: 'hackathon@starter.com',
   subject: 'Your Hackathon Starter password has been changed',
   text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`
   };
   transporter.sendMail(mailOptions, (err) => {
   req.flash('success', {msg: 'Success! Your password has been changed.'});
   done(err);
   });
   }
   ], (err) => {
   if (err) {
   return next(err);
   }
   res.redirect('/');
   });
   };
   */

  /**
   * POST /forgot
   * Create a random token, then the send user an email with a reset link.
   */
  /* TODO: later
   m.postForgot = (req, res, next) => {
   req.assert('email', 'Please enter a valid email address.').isEmail();
   req.sanitize('email').normalizeEmail({remove_dots: false});

   const errors = req.validationErrors();

   if (errors) {
   req.flash('errors', errors);
   return res.redirect('/forgot');
   }

   async.waterfall([
   function (done) {
   crypto.randomBytes(16, (err, buf) => {
   const token = buf.toString('hex');
   done(err, token);
   });
   },
   function (token, done) {
   User.findOne({email: req.body.email}, (err, user) => {
   if (!user) {
   req.flash('errors', {msg: 'Account with that email address does not exist.'});
   return res.redirect('/forgot');
   }
   user.passwordResetToken = token;
   user.passwordResetExpires = Date.now() + 3600000; // 1 hour
   user.save((err) => {
   done(err, token, user);
   });
   });
   },
   function (token, user, done) {
   const transporter = nodemailer.createTransport({
   service: 'SendGrid',
   auth: {
   user: process.env.SENDGRID_USER,
   pass: process.env.SENDGRID_PASSWORD
   }
   });
   const mailOptions = {
   to: user.email,
   from: 'hackathon@starter.com',
   subject: 'Reset your password on Hackathon Starter',
   text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
   Please click on the following link, or paste this into your browser to complete the process:\n\n
   http://${req.headers.host}/reset/${token}\n\n
   If you did not request this, please ignore this email and your password will remain unchanged.\n`
   };
   transporter.sendMail(mailOptions, (err) => {
   req.flash('info', {msg: `An e-mail has been sent to ${user.email} with further instructions.`});
   done(err);
   });
   }
   ], (err) => {
   if (err) {
   return next(err);
   }
   res.redirect('/forgot');
   });
   };
   */

  m.init(appLib);
  return m;
};
