;(function () {
  'use strict';

  angular
    .module('app.adpDashboard')
    .directive('adpDashboard', adpDashboard);

  /** @ngInject */
  function adpDashboard (
    AdpDataService,
    INTERFACE,
    DASHBOARD
  ) {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: 'app/adp-dashboard/directives/adp-dashboard/adp-dashboard.html',
      link: function (scope) {
        var dashboardName =  DASHBOARD.link;
        scope.dashboardItems = INTERFACE[dashboardName]['fields'];

        AdpDataService.getDashboardData(dashboardName)
          .then(function (response) {
            scope.dashboardData = response.data.data;
          });
      }
    };
  }
})();
