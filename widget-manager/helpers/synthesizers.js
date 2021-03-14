/**
 * Synthesizers are very similar to transformers but have different semantics and for that reason extracted to a separate file
 * They are only executed on the server side and set value for a field that is not directly based on user input
 */
const _ = require('lodash');
const { customAlphabet } = require('nanoid/async');
// excluding "confusing characters": "Il1O08B"
const alphabet = '2345679ACDEFGHJKMNOPQRSTUVWXYZ';
const generate = customAlphabet(alphabet, 24);

module.exports = () => {
  const m = {
    id24(next) {
      const { row, path } = this;
      if (_.get(row, path)) {
        return next();
      }
      return generate().then(id => {
        _.set(row, path, id);
        next();
      });
    },
  };
  return m;
};
