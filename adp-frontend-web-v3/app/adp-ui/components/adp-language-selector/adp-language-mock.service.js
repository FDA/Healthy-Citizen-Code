;(function () {
  'use strict';

  angular.module('app.adpUi')
    .factory('AdpLanguageMockService', AdpLanguageMockService);

  function AdpLanguageMockService($http, APP_CONFIG) {
    return {
      getAll: getAll,
      getByType: getByType
    };

    // METHODS
    function getByType(type) {
      return $http.get(APP_CONFIG.apiRootUrl + '/langs/' + type + '.json');
    }

    function getAll() {
      return $http.get(APP_CONFIG.apiRootUrl + '/languages.json')
    }
  }
})();