module.exports = function (globalMongoose) {
  const fs = require('fs');
  const async = require('async');
  const nodemailer = require('nodemailer');
  const log = require('log4js').getLogger("lib/test-controller");
  const _ = require('lodash');

  const mongoose = globalMongoose;
  const User = mongoose.model("users");
  const m = {};

  m.init = (appLib) => {
    if (('true' === process.env.DEVELOPMENT)) {
      appLib.addRoute('del', '/test-actions/delete-test-user', [m.deleteTestUser]);
    } else {
      log.trace(' ∟ Not loading test routes in non-development mode, please set DEVELOPMENT to true');
    }
  };

  /**
   * DELETE /test-actions/delete-test-user
   * remove user with login "test_user"
   */
  m.deleteTestUser = (req, res, next) => {
    const removeUserData = (user, cb) => {
      _.forIn(user, (value, key) => {
        if (_.endsWith(key, 'Id')) {
          let modelName = key.slice(0, -2) + 's';
          let Model = mongoose.model(modelName);

          Model.findOneAndRemove(value);
        }
      });
      cb();
    };
    async.series([
      (cb) => {
        User.findOneAndRemove({login: 'test_user'}, (err, user) => {
          if (err) {
            cb(`Unable to check if the user exists: ${err}`);
          } else if (!user) {
            cb(`User was not found: ${err}`);
          } else {
            testUserFound = user;
            removeUserData(user, cb);
          }
        });
      }
    ], (err) => {
      if (err) {
        log.error(err);
        res.json(400, {success: false, message: err});
      } else {
        res.json({success: true});
      }
      next();
    });
  };

  return m;

};
