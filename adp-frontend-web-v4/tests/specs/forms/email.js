var utils = require('../../utils');
var _ = require('lodash');

module.exports = function (field, fieldName) {
  var input = element(by.id(fieldName));

  input.clear().then(function () {
    input.sendKeys('test');
    expect(utils.hasClass(input, 'ng-invalid')).toEqual(true);

    input.sendKeys('@');
    expect(utils.hasClass(input, 'ng-invalid')).toEqual(true);

    input.sendKeys('test.com');
    expect(utils.hasClass(input, 'ng-invalid')).toEqual(false);
  });
}
