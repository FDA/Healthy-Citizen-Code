;(function () {
  'use strict';

  angular.module('app.adpUi')
    .factory('ActivityMockService', ActivityMockService);

  function ActivityMockService($http) {
    return {
      get: get,
      getByType: getByType
    };

    // METHODS
    function get() {
      return $http.get('/api/activities/activity.json');
    }

    function getByType(type) {
      return $http.get('/api/activities/activity-' + type + '.json');
    }
  }
})();