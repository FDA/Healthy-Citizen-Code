;(function() {
  'use strict';

  angular
    .module('app.adpCommon')
    .factory('AdpRouteGuardService', AdpRouteGuardService);

  /** @ngInject */
  function AdpRouteGuardService(
    AdpSessionService,
    $state
  ) {
    var service = this;

    service.redirectStrategy = function (state) {
      var DEFAULT_STATE = window.adpAppStore.defaultState();

      var redirects = {
        user: 'auth.login',
        guest: DEFAULT_STATE.stateName
      };

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
