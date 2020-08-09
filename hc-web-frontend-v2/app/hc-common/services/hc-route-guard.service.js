;(function() {
  'use strict';

  angular
    .module('app.hcCommon')
    .factory('HcRouteGuardService', HcRouteGuardService);

  /** @ngInject */
  function HcRouteGuardService(
    HcSessionService,
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
      return HcSessionService.isAuthorized();
    };

    service.guest = function() {
      return !HcSessionService.isAuthorized();
    };

    return service;
  }
})();
