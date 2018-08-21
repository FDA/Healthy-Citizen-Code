;(function () {
  'use strict';

  angular.module('app.adpUi')
    .factory('ActivityMockService', ActivityMockService);

  function ActivityMockService($http, APP_CONFIG) {
    return {
      get: get,
      getByType: getByType
    };

    // METHODS
    function get() {
      return $http.get(APP_CONFIG.apiRootUrl + '/activities/activity.json');
    }

    function getByType(type) {
      return $http.get(APP_CONFIG.apiRootUrl + '/activities/activity-' + type + '.json');
    }
  }
})();