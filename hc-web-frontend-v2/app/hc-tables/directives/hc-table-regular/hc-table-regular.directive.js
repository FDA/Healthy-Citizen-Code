;(function () {
  'use strict';

  angular
    .module('app.hcTables')
    .directive('hcTableRegular', hcTableRegular);

  function hcTableRegular(
    $state,
    $timeout,
    $filter,
    HcTablesService
  ) {
    return {
      restrict: 'E',
      scope: {
        schema: '=',
        data: '=',
        hasDetails: '=',
        filteredData: '=?',
        update: '=',
        delete: '='
      },
      replace: true,
      templateUrl: 'app/hc-tables/directives/hc-table-regular/hc-table-regular.html',
      link: function (scope, element) {
        var detailsState = $state.current.name + 'Details';

        if ('filteredData' in scope) {
          scope.filteredData = scope.data;
        }

        // datatables config
        scope.heads = HcTablesService.getHeads(scope.schema.fields);
        var heads = _.map(scope.heads, function (o) { return o.name });

        // TODO: fix it`
        $timeout(applyDT, 0);

        $(element).on('click', '.btn.table-action', function () {
          var action = $(this).data('action');
          var itemIndex = $(this).data('index');
          var item = scope.data[itemIndex];

          scope[action](item);
        });

        $(element).on('click', '.btn.details-link', function () {
          var id = $(this).data('id');

          $state.go(detailsState, {id: id});
        });

        function _wrapParagraphs(value) {
          var val = '<p>' + value + '</p>';

          return val.replace(/\n/g, '</p><p>');
        }

        function applyDT() {
          var order = getOrder();
          var data = filterData(scope.data);
          var columns = getColumns(heads);

          var otable = element.DataTable({
            columns: columns,
            data: data,
            columnDefs: [
              {
                render: _wrapParagraphs,
                targets: _.range(0, columns.length - 1)
              }
            ]
          });

          if ('filteredData' in scope) {
            otable.on('search', function (e) {
              var table = $(this).DataTable();

              scope.filteredData = table
                .rows({filter : 'applied'})
                .data();

              scope.$apply();
            });
          }

          if (order) otable.order = order;

          // Apply the filter
          scope.$on('filterChanged', function (event, searchParams) {
            // console.log(otable.column( searchParams.columnIndex ).data().eq(0));
            otable
              .column( searchParams.columnIndex )
              .search( searchParams.searchString, searchParams.isRegex, !searchParams.isRegex )
              .draw();
          });

          scope.$on('redraw', otable.draw);

          scope.$watch('data', function (newVal, oldVal) {
            if (_.xor(newVal, oldVal).length) {
              var filteredData = filterData(newVal);
              otable
                .clear()
                .rows.add(filteredData)
                .draw();
            }
          });
        }

        scope.$on('$destroy', function() {
          $.fn.dataTable.ext.search = [];
          $(element).DataTable().destroy();
        });

        function getColumns(heads) {
          var columns =  _.map(heads, function (o) {
            return {'data': o};
          });

          columns.push({
            'data': 'actions',
            'sortable': false,
            'searchable': false
          });

          return columns;
        }

        function filterData(data) {
          return _.map(data, function (dataItem, index) {
            var cellValue = {};

            _.each(scope.heads, function (head) {
              var filteredValue = $filter('hcDataPresenter')(dataItem, scope.schema, head.name);
              var template = '<span class="hidden">' + dataItem[head.name] + '</span>\n  ' +
                '<span>' + filteredValue + '</span>';

              cellValue[head.name] = (head.type === 'String') ? filteredValue : template;
            });

            cellValue.actions =
              '<button class="btn btn-success table-action" data-action="update" data-index="' + index + '">' +
                '<i class="fa fa-fw fa-pencil"></i></button>' +
              '<button class="btn btn-danger table-action" data-action="delete" data-index="' + index + '">' +
                '<i class="fa fa-fw fa-trash-o"></i></button>';

            var detailsButton = '<button class="btn btn-info details-link" data-id="' + dataItem._id + '">' +
              '<i class="fa fa-fw fa-info"></i></button>';

            // TODO: uncomment this after details page will be ready
            // if (scope.hasDetails) {
            //   cellValue.actions = detailsButton + cellValue.actions;
            // }

            return cellValue;
          });
        }

        function getOrder() {
          return _.map(scope.schema.defaultSortBy, function (val, key) {
            var index = _.findIndex(scope.heads, ['name', key]);
            var sort = (val === 1) ? 'asc' : 'desc';

            if (index !== -1) {
              return [index, sort];
            } else {
              return undefined;
            }
          });
        }

      }
    }
  }
})();
