var config = require('../config.js');
var appModel = require('../../.tmp/app-model.json');
var utils = require('../utils');

describe('logout user', function () {
  it ('shoule logout user', function (done) {
    utils.logout();
    setTimeout(done, 3000);
  });

  it ('should not authorized user to access pages', function () {
    utils.logout();

    browser.get(config.resourceUrl + appModel.interface.main_menu.fields.home.link);

    browser.waitForAngularEnabled(false);

    var loginTitle = utils.getPageTitle('Login');
    expect(browser.getTitle()).toEqual(loginTitle);
  });
});
