/**
 * Synthesizers are very similar to transformers but have different semantics and for that reason extracted to a separate file
 * They are only executed on the server side and set value for a field that is not directly based on user input
 */
const _ = require('lodash');
const nanoid = require('nanoid/async');
const { getDocValueForExpression } = require('../../lib/util/util');

// eslint-disable-next-line no-unused-vars
module.exports = appLib => {
  const m = {
    randomString(path, appModelPart, userContext, next) {
      const charset = _.get(
        appModelPart,
        'synthesize.arguments.charset',
        'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
      ); // WARNING: excludes certain letters that look like other characters
      const length = _.get(appModelPart, 'synthesize.arguments.length', 8);
      let val = '';
      for (let i = 0; i < length; ++i) {
        val += charset[Math.floor(Math.random() * charset.length)];
      }
      _.set(this, path, val);
      next();
    },
    now(path, appModelPart, userContext, next) {
      _.set(this, path, new Date());
      next();
    },
    creator(path, appModelPart, userContext, next) {
      const { user } = userContext;
      const label = _.get(appModelPart, 'lookup.table.users.label');
      if (!_.get(this, path) && user && label) {
        _.set(this, path, {
          _id: user._id,
          table: 'users',
          label: getDocValueForExpression(user, label),
        });
      }
      next();
    },
    createdAt(path, appModelPart, userContext, next) {
      if (!_.get(this, path)) {
        _.set(this, path, new Date());
      }
      next();
    },
    updatedAt(path, appModelPart, userContext, next) {
      _.set(this, path, new Date());
      next();
    },
    shortId7(path, appModelPart, userContext, next) {
      if (_.get(this, path)) {
        return next();
      }
      return nanoid(7).then(id => {
        _.set(this, path, id);
        next();
      });
    },
  };
  return m;
};
