var _ = require('lodash');

module.exports = function (schemas, schemaPath, done) {
  describe('Single record', function () {
    var form = $('.single-record-form');
    var schema = _.get(schemas, schemaPath);
    var until = protractor.ExpectedConditions;

    browser.waitForAngularEnabled(true);

    expect(form.isPresent()).toEqual(false);

    browser.wait(until.presenceOf($('.page-action')), 5000, 'Element taking too long to appear in the DOM');
    element(by.css('.page-action')).click();

    expect(form.isDisplayed()).toEqual(true);

    done();
    // require('../forms/index')(schema, '.single-record-form', done);
  });
}
