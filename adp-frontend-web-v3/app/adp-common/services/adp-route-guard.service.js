;(function() {
  'use strict';

  angular
    .module('app.adpCommon')
    .factory('AdpRouteGuardService', AdpRouteGuardService);

  /** @ngInject */
  function AdpRouteGuardService(
    AdpSessionService,
    DEFAULT_STATE,
    $state
  ) {
    var service = this;

    var redirects = {
      user: 'auth.login',
      guest: DEFAULT_STATE.stateName
    };

    service.redirectStrategy = function (state) {
      var strategy = state.data['redirectStrategy'];
      var canHaveAccess = service[strategy]();

      if (!canHaveAccess) {
        $state.go(redirects[strategy]);
      }
    };

    service.user = function() {
      return AdpSessionService.isAuthorized();
    };

    service.guest = function() {
      return !AdpSessionService.isAuthorized();
    };

    return service;
  }
})();
