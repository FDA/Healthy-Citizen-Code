/**
 * Synthesizers are very similar to transformers but have different semantics and for that reason extracted to a separate file
 * They are only executed on the server side and set value for a field that is not directly based on user input
 */
const _ = require('lodash');
const nanoid = require('nanoid/async');
const { getDocValueForExpression } = require('../../lib/util/util');

// eslint-disable-next-line no-unused-vars
module.exports = (appLib) => {
  const m = {
    randomString(next) {
      const { fieldSchema, path, row } = this;
      const charset = _.get(
        fieldSchema,
        'synthesize.arguments.charset',
        'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
      ); // WARNING: excludes certain letters that look like other characters
      const length = _.get(fieldSchema, 'synthesize.arguments.length', 8);
      let val = '';
      for (let i = 0; i < length; ++i) {
        val += charset[Math.floor(Math.random() * charset.length)];
      }
      _.set(row, path, val);
      next();
    },
    now(next) {
      const { path, row } = this;
      _.set(row, path, new Date());
      next();
    },
    creator(next) {
      const { fieldSchema, path, row, userContext } = this;
      const { user } = userContext;
      const label = _.get(fieldSchema, 'lookup.table.users.label');
      if (!_.get(row, path) && user && label) {
        _.set(row, path, {
          _id: user._id,
          table: 'users',
          label: getDocValueForExpression(user, label),
        });
      }
      next();
    },
    createdAt(next) {
      const { path, row, data } = this;
      if (!data) {
        _.set(row, path, new Date());
      }
      next();
    },
    updatedAt(next) {
      const { path, row } = this;
      _.set(row, path, new Date());
      next();
    },
    shortId7(next) {
      const { path, row, data } = this;
      if (data) {
        return next();
      }
      return nanoid(7).then((id) => {
        _.set(row, path, id);
        next();
      });
    },
    datasetSchemaFullName(next) {
      const { path, row } = this;
      // set dataset.scheme.fullName equal to dataset.name
      _.set(row, path, row.name);
      next();
    },
  };
  return m;
};
