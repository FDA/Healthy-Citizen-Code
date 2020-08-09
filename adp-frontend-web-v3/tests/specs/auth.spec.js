var config = require('../config.js');
var appModel = require('../../.tmp/app-model.json');
var utils = require('../utils');

describe('authentification test', function () {
  describe('register new user', function () {
    var login = element(by.id('login'));
    var email = element(by.id('email'));
    var password = element(by.id('password'));
    var passwordConfirmation = element(by.id('passwordConfirmation'));

    browser.get(config.resourceUrl + 'register');

    it('should decline invalid credentials', function (done) {
      browser.waitForAngularEnabled(false);

      login.sendKeys('test');
      expect(utils.hasClass(login, 'ng-invalid')).toEqual(true);

      email.sendKeys('test');
      expect(utils.hasClass(login, 'ng-invalid')).toEqual(true);

      done();
    });

    it('should accept new user', function (done) {
      utils.createUser(done);
    });

  });

  describe('login', function () {
    var login = element(by.id('login'));
    var password = element(by.id('password'));

    it('should decline invalid credentials', function (done) {
      browser.waitForAngularEnabled(false);
      browser.get(config.resourceUrl + 'login');

      login.sendKeys('test');
      expect(utils.hasClass(login, 'ng-invalid')).toEqual(true);

      login.clear().then(done);
    });

    it('should check that user authorized', function (done) {
      utils.login(function () {
        var homepageLink = appModel.interface.main_menu.fields.home.link;
        var homepageTitle = utils.getPageTitle('Home');

        browser.get(config.resourceUrl + homepageLink);

        setTimeout(function () {
          expect(browser.getTitle()).toEqual(homepageTitle);
          done();
        }, 3000);
      });
    });

  });

  afterAll(function () {
    utils.afterAll();
  });
});
