;(function () {
  'use strict';

  angular
    .module('app.hcTables')
    .directive('hcTableSimple', hcTableSimple);

  function hcTableSimple (HcTablesService) {
    return {
      restrict: 'E',
      scope: {
        schema: '=',
        data: '=',
      },
      templateUrl: 'app/hc-tables/directives/hc-table-simple/hc-table-simple.html',
      controller: function ($scope) {
        $scope.heads = HcTablesService.getHeads($scope.schema.fields);
        $scope.data = $scope.data || {};

        $scope.isEmpty = _.isEmpty;
      }
    }
  }
})();
