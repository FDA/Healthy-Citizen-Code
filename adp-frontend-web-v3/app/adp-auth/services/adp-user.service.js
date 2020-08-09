;(function() {
  'use strict';

  angular
    .module('app.adpAuth')
    .factory('AdpUserService', AdpUserService);

  /** @ngInject */
  function AdpUserService(
    $http,
    CONSTANTS
  ) {
    return {
      create: create
    };

    function create(user) {
      return $http.post(CONSTANTS.apiUrl + '/signup', user);
    }
  }
})();
