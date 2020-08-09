;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .directive('adpTableRegular', adpTableRegular);

  function adpTableRegular(
    AdpTablesActionsService,
    AdpTablesService,
    $timeout,
    $filter
  ) {
    return {
      restrict: 'E',
      scope: {
        schema: '=',
        data: '=',
        hasDetails: '=',
        filteredData: '=?',
        actions: '=',
        actionCbs: '='
      },
      replace: true,
      templateUrl: 'app/adp-tables/directives/adp-table-regular/adp-table-regular.html',
      link: function (scope, element) {
        (function init() {
          // setting props outside of _createTable function, because we need to wait for ng-repeats to generate table head
          _setScopeProperties();

          // waiting for ng-repeat to finish in table head
          $timeout(function () {
            _createTable();
            _createButtons();
            _bindEvents();
          }, 0);
        })();

        function _setScopeProperties() {
          scope.heads = AdpTablesService.getHeads(scope.schema.fields);

          scope.actionsStyles = {};
          if ('width' in scope.actions) {
            scope.actionsStyles.width = scope.actions.width + 'px';
          }

          if ('filteredData' in scope) {
            scope.filteredData = scope.data;
          }
        }

        function _createTable() {
          var columns = _getColumns(scope.heads, scope.schema);

          scope.table = element.DataTable({
              columns: columns,
              deferRender: true,
              responsive: {
                details: {
                  type: 'column'
                }
              },
              order: _getOrder(scope.heads),
              initComplete: _resizeHandler
            });
        }

        function _createButtons() {
          var columns = _getColumns(scope.heads, scope.schema);
          var buttons = new $.fn.dataTable.Buttons(scope.table, {
            buttons: [
              {
                extend: 'csvHtml5',
                exportOptions: {
                  columns: _.range(0, columns.length - 1)
                },
                title: scope.schema.fullName + ' CSV DATA',
                text: '<i class="fa fa-table"></i> Export as CSV',
                className: 'btn btn-primary'
              }
            ]
          });

          var dataTablesFilterContainer = $('.dataTables_filter', scope.table.table().container());
          dataTablesFilterContainer.append(buttons.container());
        }

        function _bindEvents() {
          $(window).on('resize.datatable', function () {
            var settings = scope.table.settings()[0];
            _resizeHandler(settings);
          });

          $(element).on('click.datatableAction', '.btn.table-action', _tableActionHandler);
          scope.$on('filterChanged', _tableFilterHandler);
          scope.$on('redraw', scope.table.draw);

          scope.$watch('data', _dataWatcherHandler);
          scope.$on('$destroy', _onDestroy);

          if ('filteredData' in scope) {
            scope.table.on('search', function (e) {
              var table = $(this).DataTable();

              scope.filteredData = table
                .rows({filter : 'applied'})
                .data();
              });
          }
        }

        // EVENTS HANDLERS: START
        function _tableActionHandler(e) {
          var action = $(this).data('action');
          var itemIndex = $(this).data('index');
          var item = scope.data[itemIndex];
          var cb;

          if (action in scope.actionCbs) {
            scope.actionCbs[action](item);
          } else {
            cb = appModelHelpers.CustomActions[action];
            cb && cb(item);
          }
        }

        function _tableFilterHandler(_event, searchParams) {
          scope.table
            .column(searchParams.columnIndex)
            .search(searchParams.searchString, searchParams.isRegex, !searchParams.isRegex)
            .draw();
        }

        function _dataWatcherHandler(newVal, oldVal) {
          var dataDiff = !_.xor(newVal, oldVal);
          var filteredData;

          if (dataDiff.length < 0) {
            return;
          }
          filteredData = _filterData(scope.data, scope.heads);

          scope.table
            .clear()
            .rows.add(filteredData)
            .draw();
        }

        function _resizeHandler(settings) {
          var tableId = settings.sTableId;
          var tableInstance = $('#' + tableId);
          var filtersCells = tableInstance.find('.columnFilters th');

          _.each(tableInstance.find('tbody tr:first-child td'), function (tableCell, index) {
            filtersCells[index].style.display = tableCell.style.display === 'none' ? 'none' : 'table-cell';
          });
        }

        function _onDestroy() {
          $.fn.dataTable.ext.search = [];
          scope.table.destroy();
          $(element).remove();
          $(window).off('resize:datatable');
          $(element).off('click.datatableAction');
        }

        // EVENTS HANDLERS: END

        function _getOrder(heads) {
          var sortByConfig = scope.schema.defaultSortBy;
          var fieldName = _.keys(sortByConfig)[0];
          var fieldIndex = _.findIndex(heads, ['name', fieldName]);
          var sortBy = (sortByConfig[fieldName] === 1) ? 'asc' : 'desc';

          if (fieldIndex > -1) {
            return [[fieldIndex, sortBy]];
          } else {
            return [[0, 'asc']]
          }
        }

        function _wrapParagraphsRender(cellValue) {
          return cellValue.toString().replace(/\n/g, '<br>')
        }

        function _getColumns(heads, schema) {
          var columns = [{
            'data': 'empty',
            'className': 'control'
          }];

          _.map(heads, function (head) {

            var field = schema.fields[head.name];
            var rendererName = field['render'];
            var rendererFn = appModelHelpers['Renderers'][rendererName];

            var column = {
              'data': head.name,
              'responsivePriority': head.responsivePriority,
            };
            var wrapperCondition = !rendererName && (field.type === 'String');


            _setColumnType(column, head);
            if (rendererName) {
              column.render = function (data, type, row, meta) {
                var itemIndex = meta.row;
                var dataRow = scope.data[itemIndex];
                var dataItem = dataRow[head.name];

                return rendererFn(dataItem, type, dataRow, meta);
              };
            }

            if (wrapperCondition) {
              column.render = _wrapParagraphsRender;
            }

            columns.push(column);
          });

          columns.push({
            'data': 'actions',
            'sortable': false,
            'searchable': false,
            'responsivePriority': scope.actions.responsivePriority || 50,
          });

          return columns;
        }

        function _setColumnType(column, head) {
          var types = ['Date', 'Date:Time', 'Date:DateTime'];

          if (types.includes(head.type)) {
            column.type = head.type;
          }
        }

        function _filterData(data, heads) {
          return _.map(data, function (dataRow, index) {
            var rowData = {empty: ''};

            _.each(heads, function (head) {
              var rendererName = scope.schema.fields[head.name]['render'];

              if (rendererName) {
                rowData[head.name] = dataRow[head.name];
              } else {
                rowData[head.name] = $filter('adpDataPresenter')(dataRow, scope.schema, head.name);
              }
            });

            rowData.actions = AdpTablesActionsService.createActions(scope.actions, index, scope.data[index]);

            return rowData;
          });
        }
      }
    }
  }
})();
