;(function () {
  'use strict';

  angular.module('app.adpUi')
    .factory('AdpProjectMockService', AdpProjectMockService);

  function AdpProjectMockService($http) {
    return {
      list: $http.get.bind(this, '/api/projects.json')
    }
  }
})();