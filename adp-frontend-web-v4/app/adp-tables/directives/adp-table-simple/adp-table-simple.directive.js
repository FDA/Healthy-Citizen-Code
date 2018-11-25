;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .directive('adpTableSimple', adpTableSimple);

  function adpTableSimple (
    AdpTablesService,
    $timeout,
    $filter
  ) {
    return {
      restrict: 'E',
      scope: {
        schema: '=',
        data: '=',
      },
      templateUrl: 'app/adp-tables/directives/adp-table-simple/adp-table-simple.html',
      link: function (scope, element) {
        (function init() {
          scope.heads = AdpTablesService.getAllHeads(scope.schema.fields);
          $timeout(_createTable, 0);
        })();

        function _createTable() {
          scope.table = element.find('table').DataTable({
            columns: _getColumns(scope.heads, scope.schema),
            data: _filterData(scope.data, scope.heads),
            searching: false,
            ordering: false,
            paging: false,
            info: false,
          });
        }

        function _getColumns(heads, schema) {
          return _.map(heads, function (head) {
            var field = schema.fields[head.name];
            var rendererName = field['render'];
            var rendererFn = appModelHelpers['Renderers'][rendererName];

            var column = { 'data': head.name };

            if (rendererName) {
              column.render = function (data, type, row, meta) {
                var dataRow = scope.data;
                var dataItem = dataRow[head.name];
                var tpl = rendererFn(dataItem, type, dataRow, meta);

                return _cellTpl(head, tpl);
              };
            }

            return column;
          });
        }

        function _filterData(data, heads) {
          var rowData = {};
          var dataItem = '';

          _.each(heads, function (head) {
            var rendererName = scope.schema.fields[head.name]['render'];

            if (rendererName) {
              dataItem = data[head.name];
            } else {
              dataItem = $filter('adpDataPresenter')(data, scope.schema, head.name);
            }

            rowData[head.name] = _cellTpl(head, dataItem);
          });

          return [rowData];
        }

        function _cellTpl(head, dataTpl) {
          return '<dl class="row"><dt class="col-md-4">' +
              head.fullName +
            '</dt><dd class="col-md-8">' +
              dataTpl +
            '</dd></dl>';
        }
      }
    }
  }
})();
