;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .directive('adpTableServerSide', adpTableServerSide);

  function adpTableServerSide (
    $timeout,
    AdpTablesService
  ) {
    return {
      restrict: 'E',
      scope: {
        schema: '=',
        data: '=',
        url: '='
      },
      replace: true,
      templateUrl: 'app/adp-tables/directives/adp-table-server-side/adp-table-server-side.html',
      link: function (scope, element) {
        scope.heads = AdpTablesService.getHeads(scope.schema.fields);
        var heads = _.map(scope.heads, function (o) { return o.name });
        $timeout(applyDT, 0);

        function applyDT() {
          var columns = getColumns(heads);
          var otable = element.DataTable({
            responsive: true,
            serverSide: true,
            ajax: {
              url: scope.url,
              type: 'GET',
              dataSrc: 'data',
              data: getFilters
            },
            columns: columns,
            columnDefs: [
              {
                targets: -1,
                responsivePriority: -1
              }
            ],
            initComplete: resizeHandler
          });

          function resizeHandler(options) {
            var tableId = !!options ? options.sTableId : otable.settings()[0].sTableId;
            var tableInstance = $('#' + tableId);
            var filtersCells = tableInstance.find('.columnFilters th');

            // manually calling table redraw to make sure, that are finished showing/hiding cells
            if (otable) otable.draw();

            _.each(tableInstance.find('tbody tr:first-child td'), function(tableCell, index) {
              if (tableCell.style.display === 'none') {
                filtersCells[index].style.display = 'none';
              } else {
                filtersCells[index].style.display = 'table-cell';
              }
            });
          }


          $(window).on('resize:datatable', function(event) {
            resizeHandler();
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

          $(window).off('resize:datatable');
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
