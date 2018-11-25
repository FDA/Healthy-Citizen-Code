const _ = require('lodash');

module.exports = () => {
  const m = {
    addOne(path, appModelPart, userContext, next) {
      _.set(this, path, _.get(this, path) + 1);
      next();
    },
    appendQ(path, appModelPart, userContext, next) {
      _.set(this, path, `${_.get(this, path)}Q`);
      next();
    },
    appendW(path, appModelPart, userContext, next) {
      _.set(this, path, `${_.get(this, path)}W`);
      next();
    },
    assignD(path, appModelPart, userContext, next) {
      path.should.equal('');
      _.set(this, 'd', new Date('2017-01-01'));
      next();
    },
  };
  return m;
};
