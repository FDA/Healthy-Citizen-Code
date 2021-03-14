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
      return $http.get(getUrl() + '/langs/' + type + '.json');
    }

    function getAll() {
      return $http.get(getUrl() + '/languages.json')
    }

    function getUrl() {
      return _.compact([APP_CONFIG.appSuffix, window.appConfig.apiRootUrl]).join('/');
    }
  }
})();
