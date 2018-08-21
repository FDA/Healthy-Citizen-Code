;(function () {
  'use strict';

  angular.module('app')
    .run(function (APP_CONFIG, $trace) {
      if (APP_CONFIG.debug) {
        $trace.enable('TRANSITION');
      }
    })
    .run(runBlock);

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
