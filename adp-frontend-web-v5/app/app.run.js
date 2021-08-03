;(function () {
  'use strict';

  angular.module('app')
    .run(setupUserData)
    .run(runBlock)
    .run(setupSocketIo)
    .run(handleReturnUrlForUnauthorizedUsers)
    .run(setupTimers);

  /** @ngInject */
  function setupUserData($rootScope) {
    var user = lsService.getUser();

    if (_.isNull(user)) {
      lsService.setGuestUserData();
      return;
    }

    $rootScope.avatar = user.avatar;
  }

  /** @ngInject */
  function runBlock(
    AdpRouteGuardService,
    AdpSessionService,
    $transitions
  ) {
    $transitions
      .onSuccess(null, function (transition) {
        var toState = transition.to();
        AdpRouteGuardService.redirectStrategy(toState);
      })

    AdpSessionService.setAjaxAuthHeaders();
  }

  function setupSocketIo(AdpSocketIoService){
    AdpSocketIoService.login();
  }

  function setupTimers(AdpSchemaService, AdpSessionHelper, AdpUserActivityHelper) {
    if (!lsService.isGuest()) {
      AdpSessionHelper.setTokenRefreshTimeout();
      AdpSessionHelper.setSessionRemainingTimeout();
      AdpUserActivityHelper.setUserActivityTracker();
    }
  }

  function handleReturnUrlForUnauthorizedUsers(
    $urlService,
    $rootScope,
    $state,
    $location
  ) {
    $rootScope.$on('$locationChangeStart', function () {
      var currentUrl = $location.path();

      var registeredRoutes = $state.get().filter(function (state) {
        if (!state.$$state().url) {
          return false;
        }
        return state.$$state().url.exec(currentUrl);
      });

      if (!registeredRoutes.length && lsService.isGuest()) {
        return $state.go('auth.login', { returnUrl: getReturnUrl($location) });
      }
    });

    function getReturnUrl(location) {
      var returnUrl = encodeURI(location.url());
      var isEmpty = returnUrl === '/' || returnUrl === '' || location.path === '/login';

      return isEmpty ? '' : returnUrl;
    }
  }
})();
