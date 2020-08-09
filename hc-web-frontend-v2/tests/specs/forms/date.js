var utils = require('../../utils');
var moment = require('moment');
var _ = require('lodash');

module.exports = function (field, fieldName) {
  var input = element(by.id(fieldName));

  input.clear().then(function () {
    var today = moment().format('DD/mm/YYYY');
    var tomorrow = moment(new Date()).add(1,'days');

    input.sendKeys('')
  });
}
