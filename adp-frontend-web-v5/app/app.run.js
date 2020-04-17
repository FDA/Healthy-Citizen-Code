;(function () {
  'use strict';

  angular.module('app')
    .run(setupUserData)
    .run(runBlock)
    .run(setupSocketIo)
    .run(handleReturnUrlForUnauthorizedUsers);

  /** @ngInject */
  function setupUserData() {
    var user = lsService.getUser();

    if (_.isNull(user)) {
      lsService.setGuestUserData();
    }
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
        return $state.go('auth.login', { returnUrl: getReturnUrl($location.url()) });
      }
    });

    function getReturnUrl(url) {
      var returnUrl = encodeURI(url);
      var isEmpty = returnUrl === '/' || returnUrl === '';

      return isEmpty ? '' : returnUrl;
    }
  }
})();
