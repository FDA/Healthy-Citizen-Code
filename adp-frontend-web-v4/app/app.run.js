;(function () {
  'use strict';

  angular.module('app')
    .run(function (APP_CONFIG, $trace) {
      if (APP_CONFIG.debug) {
        $trace.enable('TRANSITION');
      }
    })
    .run(setupUserData)
    .run(runBlock);

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
      });

    AdpSessionService.setAjaxAuthHeaders();
  }
})();
