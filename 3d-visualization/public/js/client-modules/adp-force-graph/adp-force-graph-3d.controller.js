(function () {
  angular.module('app.adpForceGraph').controller('ForceGraphController', forceGraphController);

  /** @ngInject */
  function forceGraphController(
    $scope,
    $rootScope,
    $interval,
    $timeout,
    $http,
    $sce,
    $document,
    AdpNotificationService,
    AdpClientCommonHelper,
    AdpForceGraphHelpers,
    AdpFullscreenService,
    APP_CONFIG,
    ForceGraphControllerLogic
  ) {
    ForceGraphControllerLogic.call(
      this,
      function () {}, // onInterfaceUpdate mockup
      $scope,
      $rootScope,
      $interval,
      $timeout,
      $http,
      $sce,
      $document,
      AdpNotificationService,
      AdpClientCommonHelper,
      AdpForceGraphHelpers,
      AdpFullscreenService,
      APP_CONFIG,
      function ($el, params) {
        $el.dxTagBox && $el.dxTagBox(params);
      },
      {}
    );
  }
})();