var appModel = require('../../../.tmp/app-model.json');
var utils = require('../../utils');
var schemas = appModel.models;
var config = require('../../config.js');
var _ = require('lodash');

module.exports = function (page) {
  describe('page test', function () {
    browser.waitForAngularEnabled(true);
    var pageLink, schemaPath, schema;

    it('should open page',function () {
      if (!page.link) return;

      pageLink = utils.getPageLink(page.link);
      schemaPath = utils.getSchemaPath(pageLink);
      schema = _.get(schemas, schemaPath)

      if (!schema) return;
      browser.get(config.resourceUrl + _.tail(pageLink).join(''));

      var until = protractor.ExpectedConditions;

      // var content = element(by.id('content'));
      var content = $('hc-content-container');
      
      browser.waitForAngularEnabled(true);
      browser.wait(until.presenceOf(content), 5000, 'Element taking too long to appear in the DOM');

      // Verify content loaded
      browser.wait(function () {
        return content
          .evaluate('vm.loading')
          .then(function(value) {
            return value === false;
          });
      }, 10000);

    });

    describe('', function () {
      browser.waitForAngularEnabled(false);
      var pageType, pageTitle, actionButton;

      it('should check page title', function () {
        if (!schema) return;

        pageType = utils.getPageType(schemaPath);
        pageTitle = element(by.css('h1')).getText();
        actionButton = element(by.css('.page-action'));

        expect(pageTitle).toEqual(schema.fullName);
      });

      it('should check page content', function (done) {
        if (pageType) {
          require('./' + pageType)(schemas, schemaPath, done);
        } else {
          done();
        }
      });

    });

  });

};
