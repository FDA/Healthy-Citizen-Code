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
      var strategy = state.data['redirectStrategy'];

      if (_.isUndefined(strategy)) {
        return;
      }

      var DEFAULT_STATE = window.adpAppStore.defaultState();

      var redirects = {
        user: 'auth.login',
        guest: DEFAULT_STATE.stateName
      };

      var canHaveAccess = service[strategy](state);

      if (!canHaveAccess) {
        if (redirects[strategy] === 'auth.login') {
          $state.go(redirects[strategy], { returnState: $state.current.name });
        } else {
          $state.go(redirects[strategy]);
        }
      }
    };

    service.user = function() {
      var authSettings = window.adpAppStore.appInterface().app.auth;
      if (!authSettings.requireAuthentication) {
        return true;
      }

      return !lsService.isGuest();
    };

    service.guest = function(state) {
      var authSettings = window.adpAppStore.appInterface().app.auth;

      if (state.name === 'auth.register'&& !authSettings.enableRegistration) {
        return false;
      }

      if (state.name === 'auth.login'&& !authSettings.enableAuthentication) {
        return false;
      }

      return lsService.isGuest();
    };

    return service;
  }
})();
