;(function () {
  'use strict';

  angular.module('app.adpUi')
    .factory('AdpLanguageMockService', AdpLanguageMockService);

  function AdpLanguageMockService($http) {
    return {
      getAll: getAll,
      getByType: getByType
    };

    // METHODS
    function getByType(type) {
      return $http.get(window.appConfig.apiRootUrl + '/langs/' + type + '.json');
    }

    function getAll() {
      return $http.get(window.appConfig.apiRootUrl + '/languages.json')
    }
  }
})();