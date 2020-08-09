;(function () {
  'use strict';

  angular.module('app')
    .run(runBlock);

  /** @ngInject */
  function runBlock(
    $rootScope,
    $state,
    $stateParams,
    HcRouteGuardService,
    HcSessionService
  ) {
    $rootScope.$state = $state;
    $rootScope.$stateParams = $stateParams;

    $rootScope.$on('$stateChangeSuccess', function (event, toState) {
      HcRouteGuardService.redirectStrategy(toState);
    });

    HcSessionService.setAjaxAuthHeaders();
  }
})();
