;(function() {
  'use strict';

  angular
    .module('app.hcAuth')
    .factory('HcUserService', HcUserService);

  /** @ngInject */
  function HcUserService(
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
