;(function () {
  'use strict';

  angular
    .module('app.hcTables')
    .directive('hcTableServerSide', hcTableServerSide);

  function hcTableServerSide (
    $timeout,
    HcTablesService
  ) {
    return {
      restrict: 'E',
      scope: {
        schema: '=',
        data: '=',
        url: '='
      },
      replace: true,
      templateUrl: 'app/hc-tables/directives/hc-table-server-side/hc-table-server-side.html',
      link: function (scope, element) {
        scope.heads = HcTablesService.getHeads(scope.schema.fields);
        var heads = _.map(scope.heads, function (o) { return o.name });
        $timeout(applyDT, 0);

        function applyDT() {
          var columns = getColumns(heads);
          var otable = element.DataTable({
            serverSide: true,
            ajax: {
              url: scope.url,
              type: 'GET',
              dataSrc: 'data',
              data: getFilters
            },
            columns: columns
          });

          var customFilters = getCustomFilters(scope.heads);
          function getFilters (d) {
            return _.extend(d, customFilters);
          }

          scope.$on('filterChanged', handleFilters);

          scope.$on('redraw', handleFilters);

          function handleFilters(event, filterParams) {
            var filterName = getFilterName(filterParams.columnIndex);

            _.unset(customFilters[filterName], 'no_filter');
            _.extend(customFilters[filterName], filterParams.serverSideParams);

            otable.draw();
          }
        }

        scope.$on('$destroy', function() {
          $.fn.dataTable.ext.search = [];
          $(element).DataTable().destroy();
        });

        function getColumns(heads) {
          var columns =  _.map(heads, function (o) {
              return {
                data: o,
                defaultContent: ' '
              };
          });

          return columns;
        }

        function getCustomFilters(heads) {
          var filters = {};

          _.each(heads, function (head, index) {
            var filterName = getFilterName(index);
            filters[filterName] = {
              field: head.name,
              no_filter: true
            };
          });

          return filters;
        }

        function getFilterName(index) {
          return 'ext_filter[' + index + ']';
        }
      }
    }
  }
})();
