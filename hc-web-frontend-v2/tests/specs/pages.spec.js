var config = require('../config.js');
var appModel = require('../../.tmp/app-model.json');
var utils = require('../utils');
var _ = require('lodash');
var schemas = appModel.models;

describe('Interface iterator', function () {
  beforeAll(function (done) {
    utils.beforeAll(done);
  });

  describe('', function () {
    var pages = appModel.interface.main_menu.fields;

    function checkPages(pages){
      _.each(pages, function (page) {
        require('./pagesSpecs/index')(page);

        if (page.fields) checkPages(page.fields);
      });
    };

    checkPages(pages);
  });

  afterAll(function () {
    utils.afterAll();
  });
});
