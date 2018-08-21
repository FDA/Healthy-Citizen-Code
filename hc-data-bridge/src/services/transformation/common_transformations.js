const _ = require('lodash');
const moment = require('moment');

module.exports = {
  getDate (date) {
    const momentDate = moment(date);
    return momentDate.isValid() ? momentDate.format('YYYY-MM-DD') : null;
  },
};
