;(function() {
  'use strict';

  angular
    .module('app.adpCommon')
    .factory('AdpRouteGuardService', AdpRouteGuardService);

  /** @ngInject */
  function AdpRouteGuardService(
    AdpSessionService,
    $location,
    $state,
    $urlService
  ) {
    var service = this;

    service.redirectStrategy = function (state) {
      var strategy = state.data['redirectStrategy'];

      if (_.isUndefined(strategy)) {
        return;
      }

      var DEFAULT_STATE = window.adpAppStore.defaultState();
      var returnState = ($state.current.name === 'auth.login') && _.find($state.get(), function (s) {
        if (!s.$$state().url) {
          return false;
        }

        return s.$$state().url.exec($location.search().returnUrl);
      });

      var redirects = {
        user: 'auth.login',
        guest: (returnState && returnState.name) || DEFAULT_STATE.stateName,
      };

      var canHaveAccess = service[strategy](state);

      if (!canHaveAccess) {
        if (redirects[strategy] === 'auth.login') {
          $state.go(redirects[strategy], { returnUrl: encodeURI($location.url()) });
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

      if (state.name === 'auth.forgot' && !authSettings.enableUserPasswordReset) {
        return false;
      }

      return lsService.isGuest();
    };

    return service;
  }
})();
