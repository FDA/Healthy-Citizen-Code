;(function () {
  'use strict';

  angular.module('app.adpUi')
    .factory('AdpProjectMockService', AdpProjectMockService);

  function AdpProjectMockService($http, APP_CONFIG) {
    return {
      list: $http.get.bind(this, APP_CONFIG.apiRootUrl + '/projects.json')
    }
  }
})();