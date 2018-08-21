var _ = require('lodash');
var request = require('request');
var config = require('../config');
var auth = require('./auth');
var appModel = require('../../.tmp/app-model.json');

var utils = {
  getMenuItemsLength: getMenuItemsLength,
  getDashboardItemsLength: getDashboardItemsLength,
  getPageTitle: getPageTitle,
  hasClass: hasClass,
  beforeAll: beforeAll,
  afterAll: afterAll
}

module.exports = utils;

function getMenuItemsLength (menuConfig) {
  var menuItems = 0;
  function countItems(menuConfig) {
    _.each(menuConfig.fields, function (value, key) {
      menuItems++;
      if (value.fields) {
        countItems(value);
      }
    });
  };
  countItems(menuConfig)

  return menuItems;
}


function getDashboardItemsLength () {
  var dashboardType = appModel.interface.main_menu.fields.home.link;
  var dashboardConfig = appModel.interface[dashboardType];

  var items = dashboardConfig.fields;

  return _.size(items);
}


function getPageTitle (pageName) {
  var appName = appModel.interface.app.title;
  return pageName + ' | ' + appName;
}


function hasClass (element, cls) {
  return element.getAttribute('class').then(function (classes) {
    return classes.split(' ').indexOf(cls) !== -1;
  });
}


function beforeAll(done) {
  auth.createUser(done, auth.login);
}


function afterAll() {
  auth.logout();
  auth.removeUser();
}
