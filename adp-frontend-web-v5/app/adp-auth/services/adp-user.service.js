;(function() {
  'use strict';

  angular
    .module('app.adpAuth')
    .factory('AdpUserService', AdpUserService);

  /** @ngInject */
  function AdpUserService(
    $http,
    APP_CONFIG
  ) {
    return {
      create: create
    };

    function create(user) {
      return $http.post(APP_CONFIG.apiUrl + '/signup', user);
    }
  }
})();
