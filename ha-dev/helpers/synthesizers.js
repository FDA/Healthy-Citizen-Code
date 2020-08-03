const _ = require('lodash');

module.exports = function () {
  return {
    udid(next) {
      const { row, path, userContext } = this;
      const udid = _.get(userContext, 'session.udid');
      if (!udid) {
        throw 'UDID was not specified';
      } else if (userContext.method === 'POST') {
        _.set(row, path, udid);
      }
      next();
    },
  };
};
