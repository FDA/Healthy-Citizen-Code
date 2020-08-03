const _ = require('lodash');

module.exports = () => {
  const m = {
    addOne(next) {
      const { row, path, data } = this;
      _.set(row, path, data + 1);
      next();
    },
    appendQ(next) {
      const { row, path, data } = this;
      _.set(row, path, `${data}Q`);
      next();
    },
    appendW(next) {
      const { row, path, data } = this;
      _.set(row, path, `${data}W`);
      next();
    },
    assignD(next) {
      const { row, path } = this;
      path.should.equal('');
      _.set(row, 'd', new Date('2017-01-01'));
      next();
    },
  };
  return m;
};
