var _ = require('lodash');
var request = require('request');
var config = require('../config');
var appModel = require('../../.tmp/app-model.json');

var utils = {
  createUser: createUser,
  login: login,
  clickCaptcha: clickCaptcha,
  logout: logout,
  removeUser: removeUser
}

module.exports = utils;

function createUser (done, cb) {
  var login = element(by.id('login'));
  var email = element(by.id('email'));
  var password = element(by.id('password'));
  var passwordConfirmation = element(by.id('passwordConfirmation'));

  browser.waitForAngularEnabled(false);
  browser.get(config.resourceUrl + 'register');

  login.clear().then(function() {
    login.sendKeys(config.testUser.login);
  });

  email.clear().then(function () {
    email.sendKeys(config.testUser.email);
  });

  password.clear().then(function () {
    password.sendKeys(config.testUser.password);
  });

  passwordConfirmation.clear().then(function () {
    passwordConfirmation.sendKeys(config.testUser.password);
  });

  utils.clickCaptcha(function () {
    setTimeout($('.btn').click, 6000);

    setTimeout(function () {
      if (cb) {
        cb(done)
      } else {
        done();
      }
    }, 9000);
  });
}


function login(done) {
  browser.get(config.resourceUrl + 'login');
  browser.waitForAngularEnabled(false);

  element(by.id('login')).sendKeys(config.testUser.login);
  element(by.id('password')).sendKeys(config.testUser.password);

  utils.clickCaptcha(function () {
    setTimeout($('.btn').click, 6000);

    setTimeout(done, 9000);
  });
}


function clickCaptcha(cb) {
  var recaptcha = $('.recaptcha iframe');
  var until = protractor.ExpectedConditions;

  browser.wait(until.presenceOf(recaptcha), 5000, 'Recaptcha taking too long to appear in the DOM');

  browser.switchTo().frame(recaptcha.getWebElement());
  $(".recaptcha-checkbox-checkmark").click();
  browser.switchTo().defaultContent();

  cb();
}


function logout() {
  browser.get(config.resourceUrl + 'logout');
}

function removeUser(cb) {
  var options = {
    method: 'DELETE',
    url: config.apiUrl + '/test-actions/delete-test-user',
  };

  function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
      if (cb) cb();
    } else {
      console.error('Test user was\'t removed');
    }
  }

  request(options, callback);
}
