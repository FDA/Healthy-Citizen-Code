;(function () {
  'use strict';

  angular
    .module('app.hcDashboard')
    .directive('hcDashboard', hcDashboard);

  /** @ngInject */
  function hcDashboard (
    HcDataService,
    INTERFACE
  ) {
    return {
      restrict: 'E',
      scope: {
        type: '@'
      },
      replace: true,
      templateUrl: 'app/hc-dashboard/directives/hc-dashboard/hc-dashboard.html',
      link: function (scope) {
        scope.dashboardItems = INTERFACE[scope.type]['fields'];

        HcDataService.getDashboardData(scope.type)
          .then(function (response) {
            scope.dashboardData = response.data.data;
          });
      }
    };
  }
})();
