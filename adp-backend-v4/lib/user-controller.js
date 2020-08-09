/**
 * Implement user authentication and authorization
 * @returns {{}}
 */

module.exports = function (appLib) {
    const fs = require('fs');
    const async = require('async');
    const nodemailer = require('nodemailer');
    const log = require('log4js').getLogger("lib/user-controller");
    const mongoose = require('mongoose');
    const User = mongoose.model("users");
    const jwt = require('jsonwebtoken');
    const passport = require('passport');
    const transformers = require('./transformers')();
    const butil = require('./backend-util')();
    const _ = require('lodash');

    const m = {};

    m.init = (appLib) => {
        log.trace("Adding custom routes for User controller");
        appLib.addRoute('post', '/login', [m.postLogin]);
        appLib.addRoute('get', '/logout', [m.logout]);
        //appLib.addRoute('get', '/forgot', [m.getForgot]);
        //appLib.addRoute('post', '/forgot', [m.postForgot]);
        //appLib.addRoute('get', '/reset/:token', [m.getReset]);
        //appLib.addRoute('post', '/reset/:token', [m.postReset]);
        appLib.addRoute('post', '/signup', [m.postSignup]);
        appLib.addRoute('post', '/account/password', [appLib.isAuthenticated, m.postUpdatePassword]);
        //appLib.addRoute('post', '/account/delete', [appLib.isAuthenticated, m.postDeleteAccount]);

        // delete /piis and /phis routes
        _.each(appLib.app.router.mounts, (route, key) => {
            if (route.spec.method === 'GET' && ( (route.spec.path === '/phis' || (route.spec.path === '/piis')))) {
                appLib.app.rm(key);
            }
        });
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
                            email: user.email
                        }, process.env.JWT_SECRET, {expiresIn: "1d"});

                        User.findById(user._id, (err, existingUser) => {
                            if (err) {
                                log.error(`Error finding user: ${err}`);
                                res.json({success: false, message: 'Error finding user'});
                            } else if (!existingUser) {
                                log.error(`Unable to find user: ${user}`);
                                res.json({success: false, message: `Unable to find user`});
                            } else {
                                let linkedRecords = _(appModel.models.users.fields)
                                    .map((val, key) => {
                                        return {key: key, lookup: val.lookup, required: val.required}
                                    })
                                    .filter((val, key) => {
                                        return val.lookup && val.required
                                    })
                                    .keyBy('key')
                                    .mapValues((val) => {
                                        return existingUser[val.key]
                                    })
                                    .value();
                                let userData = _.merge(linkedRecords, {
                                    id: user._id,
                                    login: user.login
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
        res.json({success: true, message: "User has been logged out"});
    };

    // TODO: Customize this, not all users will have PHI date (and possibly not even PII)
    m.postSignup = (req, res, next) => {
        let createdUser, createdPii, createdPhi;
        let linkedRecords = {};
        async.series([
            (cb) => { // validate user input
                transformers.preSaveTransformData('users', req.body, [], cb);
            },
            (cb) => { // check if user already exists
                User.findOne({login: req.body.login}, (err, existingUser) => {
                    if (err) {
                        cb(`Unable to check if the user already exists: ${err}`);
                    } else if (existingUser) {
                        cb(`User ${req.body.login} already exists`);
                    } else {
                        cb();
                    }
                });
            },
            // TODO: run this recursively so if any n-level collections are also required then create them as well
            // TODO: write tests for this
            // TODO: turn on auto-generator for values
            (cb) => { // create all dependant collections (1 level only)
                async.eachOfSeries(appModel.models.users.fields, (fieldSpec, key, cb) => {
                    if (fieldSpec.lookup && fieldSpec.required) {
                        if (_.isString(fieldSpec.lookup.table)) {
                            let linkedModel = mongoose.model(`${fieldSpec.lookup.table}`);
                            if (linkedModel) {
                                let linkedRecord = new linkedModel({});
                                linkedRecord.save((err, data) => {
                                    linkedRecords[key] = data._id;
                                    cb();
                                });
                            } else {
                                cb(`Linked table ${fieldSpec.lookup.table} not found`);
                            }
                        } else {
                            cb(`Multiple lookup tables are not supported in users' account creation with linked tables yet.`);
                        }
                    } else {
                        cb();
                    }
                }, cb);
            },
            (cb) => { // create user record
                let userData = _.merge(linkedRecords, {
                    email: req.body.email,
                    login: req.body.login
                });
                User.register(new User(userData), req.body.password, function (err, data) {
                    if (err) {
                        log.error(`Unable to create user : ${err}`);
                        cb(`Unable to create user`);
                    } else {
                        createdUser = data;
                        cb();
                    }
                });
            },
        ], (err) => {
            if (err) {
                log.error(err);
                res.json(400, {success: false, message: err});
            } else {
                res.json({
                    success: true,
                    message: "Account had been successfully created",
                    id: createdUser._id, // TODO: drop it, it's in the data
                    data: _.merge(linkedRecords, {
                        id: createdUser._id,
                        login: req.body.login
                    })
                });
            }
            next();
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
        async.series([
            (cb) => { // validate user input
                transformers.preSaveTransformData('users', req.body, ['password'], cb);
            },
            (cb) => { // find user
                User.findById(req.user.id, (err, user) => {
                    if (err) {
                        cb(`Unable to check if the user exists: ${err}`);
                    } else if (!user) {
                        cb(`User was not found: ${err}`);
                    } else {
                        userFound = user;
                    }
                });
            },
            (cb) => { // update password
                userFound.password = req.body.password;
                userFound.save((err) => {
                    if (err) {
                        cb(`Unable to update user password: ${err}`);
                    } else {
                        cb();
                    }
                });
            }
        ], (err) => {
            if (err) {
                log.error(err);
                res.json(400, {success: false, message: err});
            } else {
                res.json({success: true, message: "User password was successfully updated", id: createdUser._id});
            }
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