module.exports = globalMongoose => {
  // const fs = require('fs');
  // const nodemailer = require('nodemailer');
  const async = require('async');
  const log = require('log4js').getLogger('lib/test-controller');
  const _ = require('lodash');

  const mongoose = globalMongoose;
  const User = mongoose.model('users');
  const m = {};

  m.init = appLib => {
    if (process.env.DEVELOPMENT === 'true') {
      appLib.addRoute('del', '/test-actions/delete-test-user', [m.deleteTestUser]);
    } else {
      log.trace(
        ' ∟ Not loading test routes in non-development mode, please set DEVELOPMENT to true'
      );
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
          const modelName = `${key.slice(0, -2)}s`;
          const Model = mongoose.model(modelName);

          Model.findOneAndRemove(value);
        }
      });
      cb();
    };
    async.series(
      [
        cb => {
          User.findOneAndRemove({ login: 'test_user' }, (err, user) => {
            if (err) {
              cb(`Unable to check if the user exists: ${err}`);
            } else if (!user) {
              cb(`User was not found: ${err}`);
            } else {
              removeUserData(user, cb);
            }
          });
        },
      ],
      err => {
        if (err) {
          log.error(err);
          res.status(400).json({ success: false, message: err });
        } else {
          res.json({ success: true });
        }
        next();
      }
    );
  };

  return m;
};
