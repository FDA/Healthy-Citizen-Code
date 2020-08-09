;(function () {
  'use strict';

  angular.module('app')
    .run(runBlock);

  /** @ngInject */
  function runBlock(
    $rootScope,
    $state,
    $stateParams,
    AdpRouteGuardService,
    AdpSessionService
  ) {
    $rootScope.$state = $state;
    $rootScope.$stateParams = $stateParams;

    $rootScope.$on('$stateChangeSuccess', function (event, toState) {
      AdpRouteGuardService.redirectStrategy(toState);
    });

    AdpSessionService.setAjaxAuthHeaders();
  }
})();
