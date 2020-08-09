;(function () {
  'use strict';

  angular.module('app.hcUi')
    .factory('HcProjectMockService', HcProjectMockService);

  function HcProjectMockService($http, APP_CONFIG) {
    return {
      list: $http.get.bind(this, APP_CONFIG.apiRootUrl + '/projects.json')
    }
  }
})();