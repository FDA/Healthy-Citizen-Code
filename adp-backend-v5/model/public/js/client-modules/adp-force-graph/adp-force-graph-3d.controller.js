(function() {
  angular.module('app.adpForceGraph').controller('ForceGraphController', forceGraphController);

  /** @ngInject */
  function forceGraphController(
    $scope,
    $rootScope,
    $interval,
    $timeout,
    $http,
    $document,
    AdpNotificationService,
    AdpClientCommonHelper,
    AdpForceGraphHelpers,
    APP_CONFIG,
    ForceGraphControllerLogic
  ) {
    ForceGraphControllerLogic.call(
      this,
      function() {}, // onInterfaceUpdate mockup
      $scope,
      $rootScope,
      $interval,
      $timeout,
      $http,
      $document,
      AdpNotificationService,
      AdpClientCommonHelper,
      AdpForceGraphHelpers,
      APP_CONFIG,
      function($el, params) {
        $el.dxTagBox && $el.dxTagBox(params);
      },
      {}
    );
  }
})();
