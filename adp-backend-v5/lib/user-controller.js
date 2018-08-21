/**
 * Implement user authentication and authorization
 * @returns {{}}
 */

module.exports = function (appLib) {
  const fs = require('fs');
  const async = require('async');
  const nodemailer = require('nodemailer');
  const log = require('log4js').getLogger('lib/user-controller');
  const mongoose = require('mongoose');
  const User = mongoose.model('users');
  const Role = mongoose.model('roles');
  const jwt = require('jsonwebtoken');
  const passport = require('passport');
  const ObjectID = require('mongodb').ObjectID;
  const transformers = require('./transformers')(appLib);
  // const butil = require('./backend-util')();
  const _ = require('lodash');

  const m = {};
  m.appLib = appLib;

  m.init = () => {
    log.trace('Adding custom routes for User controller');
    if (appLib.getAuthSettings().enableAuthentication !== false) {
      appLib.addRoute('post', '/login', [m.postLogin]);
      appLib.addRoute('get', '/logout', [m.logout]);
      appLib.addRoute('post', '/signup', [m.appLib.isAuthenticated, m.postSignup]);
      appLib.addRoute('post', '/account/password', [m.appLib.isAuthenticated, m.postUpdatePassword]);
      //appLib.addRoute('get', '/forgot', [m.getForgot]);
      //appLib.addRoute('post', '/forgot', [m.postForgot]);
      //appLib.addRoute('get', '/reset/:  token', [m.getReset]);
      //appLib.addRoute('post', '/reset/:token', [m.postReset]);
      //appLib.addRoute('post', '/account/delete', [m.appLib.isAuthenticated, m.postDeleteAccount]);
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
    passport.authenticate('local', function (err, user, info) {
      if (err) {
        return next(`ERR: ${err} INFO:${info}`);
      } else if (!user) {
        return res.json(401, {success: false, message: 'Invalid credentials.'});
      } else {
        req.logIn(user, function (err) {
          if (err) {
            next(err);
          } else {
            let token = jwt.sign({
                id: user._id,
                email: user.email,
              }, process.env.JWT_SECRET,
              // {expiresIn: '1d'}, // set expiresIn value to make it expired
            );

            User.findById(user._id, (err, existingUser) => {
              if (err) {
                log.error(`Error finding user: ${err}`);
                res.json({success: false, message: 'Error finding user'});
              } else if (!existingUser) {
                log.error(`Unable to find user: ${user}`);
                res.json({success: false, message: `Unable to find user`});
              } else {
                let linkedRecords = _(appLib.appModel.models.users.fields)
                  .map((val, key) => {
                    return {key: key, lookup: val.lookup, required: val.required};
                  })
                  .filter((val, key) => {
                    return val.lookup && val.required;
                  })
                  .keyBy('key')
                  .mapValues((val) => {
                    return existingUser[val.key];
                  })
                  .value();
                let userData = _.merge(linkedRecords, {
                  id: user._id,
                  login: user.login,
                });
                res.json({success: true, data: {token: token, user: userData}});
              }
            });
          }
        });
      }
    })(req, res, next);
  };

  m.logout = (req, res) => {
    req.logout();
    res.json({success: true, message: 'User has been logged out'});
  };

  // TODO: Customize this, not all users will have PHI date (and possibly not even PII)
  m.postSignup = (req, res, next) => {
    const userPermissions = appLib.accessUtil.getUserPermissions(req);
    if (!userPermissions.has(m.appLib.accessCfg.PERMISSIONS.createUserAccounts)) {
      return res.json(401, {success: false, message: `Not authorized to signup`});
    }

    let createdUser, createdPii, createdPhi;
    let linkedRecords = {};

    // need to pregenerate user doc object id to be able to set it in dependent fields like 'creator'
    const userDocObjectId = new ObjectID();
    const userContext = {
      _id: userDocObjectId
    };
    return transformers.preSaveTransformData('users', userContext, req.body, [])
      .then(() => {
        // check if user already exists
        return User.findOne({login: req.body.login});
      })
      .catch((err) => {
        throw new Error(`Unable to check if the user already exists: ${err}`);
      })
      .then((existingUser) => {
        if (existingUser) {
          throw new Error(`User ${req.body.login} already exists`);
        }
        // TODO: run this recursively so if any n-level collections are also required then create them as well
        // TODO: write tests for this
        // TODO: turn on auto-generator for values
        // create all dependant collections (1 level only)
        return Promise.map(Object.entries(appLib.appModel.models.users.fields), ([key, fieldSpec]) => {
          if (fieldSpec.lookup && fieldSpec.required) {
            const tableLookups = Object.values(fieldSpec.lookup.table);
            if (tableLookups.length !== 1) {
              throw new Error(`Required table lookups must contain only 1 lookup. Specified lookup contains more: ${fieldSpec.lookup}`);
            }
            const tableLookup = tableLookups[0];
            const tableName = tableLookup.table;
            const linkedModel = mongoose.model(tableName);
            if (!linkedModel) {
              throw new Error(`Linked table ${tableName} not found`);
            }

            const linkedRecord = new linkedModel({});
            return transformers.preSaveTransformData(tableName, userContext, linkedRecord, [])
              .then(() => linkedRecord.save())
              .then((data) => {
                linkedRecords[key] = data._id;
              })
              .catch((err) => {
                const errorMsg = `Error occurred while creating linked record for ${tableName}`;
                throw new Error(errorMsg);
              });

          }
        });
      })
      .then(() => {
        // create user record
        let userData = _.merge(linkedRecords, {
          _id: userDocObjectId,
          email: req.body.email,
          login: req.body.login,
        });
        return new Promise((resolve, reject) => {
          User.register(new User(userData), req.body.password, function (err, data) {
            if (err) {
              log.error(err);
              throw new Error(`Unable to create user`);
            } else {
              createdUser = data;
              resolve();
            }
          });
        });
      })
      .then(() => {
        res.json({
          success: true,
          message: 'Account had been successfully created',
          id: createdUser._id, // TODO: drop it, it's in the data
          data: _.merge(linkedRecords, {
            id: createdUser._id,
            login: req.body.login,
          }),
        });
      })
      .catch((err) => {
        log.error(err);
        res.json(400, {success: false, message: err.message});
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
    return transformers.preSaveTransformData('users', userContext, req.body, ['password'])
      .then(() => {
        return User.findById(_.get(req, 'user.id'));
      })
      .then((user) => {
        if (!user) {
          throw new Error(`User was not found.`);
        }
        userFound = user;
      })
      .then(() => {
        // update password
        userFound.password = req.body.password;
        return userFound.save()
          .catch((err) => {
            throw new Error(`Unable to update user password: ${err}`);
          });
      })
      .then((updatedUser) => {
        res.json({success: true, message: 'User password was successfully updated', id: updatedUser._id});
      })
      .catch((err) => {
        log.error(err);
        res.json(400, {success: false, message: err});
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
