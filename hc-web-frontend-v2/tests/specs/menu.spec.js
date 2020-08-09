var appModel = require('../../.tmp/app-model.json');
var config = require('../config');
var utils = require('../utils');

describe('menu test', function () {
  beforeAll(function (done) {
    utils.beforeAll(done);
  });

  var homepageLink = appModel.interface.main_menu.fields.home.link;

  it('should have correct menu lehgth', function () {
    browser.waitForAngularEnabled(false);
    browser.get(config.resourceUrl + homepageLink);
    browser.waitForAngularEnabled(true);
    
    var menuItems = element.all(by.css('ul[smart-menu] li'));
    var expectedMenuLength = utils.getMenuItemsLength(appModel.interface.main_menu);

    expect(menuItems.count()).toEqual(expectedMenuLength);
  });

  afterAll(function () {
    utils.afterAll();
  });
});
