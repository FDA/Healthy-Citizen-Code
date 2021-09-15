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
    var vm = this;

    vm.$onInit = function () {
      $timeout(function () {
        ForceGraphControllerLogic.call(
          vm,
          function () {
          }, // onInterfaceUpdate mockup
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
          doLoadData,
          doLoadConfig,
          {}
        );
      })
    }

    function doLoadData() {
      return $http
        .get(APP_CONFIG.apiUrl + '/getFdaVipFgData')
        .then(function (res) {
          if (res) {
            return AdpForceGraphHelpers.prepareGraphData(res.data);
          } else {
            return {}
          }
        });
    }

    function doLoadConfig() {
      return $http
        .post(APP_CONFIG.apiUrl + '/graphql', {
          query: 'query q( $filter: mongoQueryInput ) {userSettings( filter: $filter ) { items { settings } }}',
          variables: {
            filter: {'mongoQuery': '{ type: { $eq: \'fg3d\'} }'},
          }
        })
        .then(function (resp) {
          return _.get(resp, 'data.data.userSettings.items[0].settings', {});
        })

    }
  }
})();
