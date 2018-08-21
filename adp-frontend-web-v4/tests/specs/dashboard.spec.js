var config = require('../config');
var appModel = require('../../.tmp/app-model.json');
var utils = require('../utils');

describe('dahsboard test', function () {
  beforeAll(function (done) {
    utils.beforeAll(done);
  });

  var homepageLink = appModel.interface.main_menu.fields.home.link;

  browser.waitForAngularEnabled(true);

  it('should have dashboard on homepage', function (done) {
    browser.waitForAngularEnabled(false);
    browser.get(config.resourceUrl + homepageLink);

    browser.waitForAngularEnabled(true);

    var dashboard = element.all(by.css('.hc-dashboard'));
    expect(dashboard.count()).toEqual(1);

    done();
  });

  it('should have correct number of dashboard tiles', function () {
    browser.get(config.resourceUrl + homepageLink);

    var dashboardTiles = element.all(by.css('.hc-dashboard__tile'));
    var expectedTilesLenght = utils.getDashboardItemsLength();

    expect(dashboardTiles.count()).toEqual(expectedTilesLenght);
  });


  afterAll(function () {
    utils.afterAll();
  });
});
