var _ = require('lodash');

module.exports = function (schemas, schemaPath, done) {
  describe('Multi record Nested', function () {
    var form = $('.smart-form');
    var button = $('.page-action');
    var schema = _.get(schemas, schemaPath);
    var EC = protractor.ExpectedConditions;

    browser.waitForAngularEnabled(false);

    browser.wait(EC.presenceOf(button), 5000, 'Button taking too long to appear in the DOM');

    button.click();

    expect($$('.smart-form').count()).toEqual(1);

    var parentSelect = element(by.css('hc-form-field-parent-select'));
    expect(browser.isElementPresent(parentSelect)).toEqual(true);

    element(by.partialButtonText('Cancel'));

    browser.waitForAngularEnabled(true);

    done();
  });
}
