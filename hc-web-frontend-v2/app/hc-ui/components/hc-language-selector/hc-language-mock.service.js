;(function () {
  'use strict';

  angular.module('app.hcUi')
    .factory('HcLanguageMockService', HcLanguageMockService);

  function HcLanguageMockService($http, APP_CONFIG) {
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