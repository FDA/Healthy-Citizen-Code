;(function () {
  'use strict';

  angular
    .module('app.adpDashboard')
    .directive('adpDashboard', adpDashboard);

  /** @ngInject */
  function adpDashboard (AdpDataService) {
    var INTERFACE = window.adpAppStore.appInterface();

    return {
      restrict: 'E',
      replace: true,
      scope: {
        dashboardName: '='
      },
      templateUrl: 'app/adp-dashboard/directives/adp-dashboard/adp-dashboard.html',
      link: function (scope) {
        scope.dashboardItems = INTERFACE[scope.dashboardName]['fields'];

        AdpDataService.getDashboardData(scope.dashboardName)
          .then(function (data) {
            scope.dashboardData = data;
          });
      }
    };
  }
})();
