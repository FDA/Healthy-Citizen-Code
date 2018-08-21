;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .directive('adpTableClientSide', adpTableClientSide);

  function adpTableClientSide(DATE_FORMAT, $timeout) {
    return {
      restrict: 'E',
      scope: {
        data: '=',
      },
      replace: true,
      templateUrl: 'app/adp-tables/directives/adp-table-client-side/adp-table-client-side.html',
      link: function (scope, element) {
        _setScopeProperties();

        $timeout(function init() {
          _createTable();
          _createButtons();
          _bindEvents();
        }, 0);

        function _setScopeProperties() {
          scope.data.summaryData = scope.data.summaryData || scope.data;
          scope.heads = getHeads(scope.data.summaryData);
          scope.filters = getFilters(scope.data.summaryData);
        }

        function _createTable() {
          scope.table = element.DataTable({
            responsive: true,
            data: getDataSet(scope.data.summaryData, scope.heads),
            columns: getColumns(scope.heads),
          });
        }

        function _createButtons() {
          var buttons = new $.fn.dataTable.Buttons(scope.table, {
            buttons: [
              {
                extend: 'csvHtml5',
                title: 'CSV DATA',
                text: '<i class="fa fa-table"></i> Export as CSV',
                className: 'btn btn-primary'
              }
            ]
          });

          var dataTablesFilterContainer = $('.dataTables_filter', scope.table.table().container());
          dataTablesFilterContainer.append(buttons.container());
        }

        function _bindEvents() {
          // WORKAROUND: for some reason we need to trigger responsive adjust() after table filled with content
          element.on('draw.dt', function () {
            element.DataTable().columns.adjust();
            _adjustFilterCols();
          });
          element.on('responsive-resize.dt', _adjustFilterCols);

          scope.$on('filterChanged', handleFilters);
          scope.$on('redraw', scope.table.draw);

          scope.$on('$destroy', function() {
            $.fn.dataTable.ext.search = [];
            $(element).DataTable().destroy();
            element.off('draw.dt');
            element.off('responsive-resize.dt');
          });
        }

        function _adjustFilterCols() {
          var filtersCells = element.find('.columnFilters th');

          _.each(element.find('tbody tr:first-child td'), function (tableCell, index) {
            var displayStyles = tableCell.style.display === 'none' ? 'none' : 'table-cell';
            filtersCells[index].style.display = displayStyles;
          });
        }

        function handleFilters(event, searchParams) {
          scope.table
            .column(searchParams.columnIndex)
            .search(searchParams.searchString, searchParams.isRegex, !searchParams.isRegex)
            .draw();
        }

        function getHeads(tableData) {
          var keys = _.map(tableData, function (row) {
            return Object.keys(row);
          });

          var longestItem = indexOfLongest(keys);

          return keys[longestItem];
        }

        function getColumns(heads) {
          return _.map(heads, function (item) {
            return { title: item };
          });
        }

        function getDataSet(tableData, heads) {
          return _.map(tableData, function (dataRow) {
            return _.map(heads, function (head) {
              var dataItem = dataRow[head], iconName;
              if (isDate(dataItem)) {
                return moment(dataItem).format(DATE_FORMAT);
              }

              if (_.isBoolean(dataItem)) {
                iconName = dataItem ? 'check' : 'times';

                return [
                  '<i class="fa fa-' + iconName + '"></i>',
                  '<span class="hidden">' + dataItem + '</span>'
                ].join('');
              }

              return dataItem || '-';
            });
          });
        }

        function getFilters(tableData) {
          var longestItem = indexOfLongest(tableData);

          return _.map(tableData[longestItem], function (item) {
            return { filter: getFilterType(item) };
          });
        }

        function getFilterType(dataItem) {
          // order is important because date string and string are the same data types
          if (_.isBoolean(dataItem)) {
            return { directiveType: 'boolean' };
          }

          if (isDate(dataItem)) {
            return { directiveType: 'date' };
          }

          if (_.isString(dataItem)) {
            return { directiveType: 'string', uiSubtypeType: 'string' };
          }

          if (_.isNumber(dataItem)) {
            return { directiveType: 'number', uiSubtypeType: 'number' };
          }

          if (_.isArray(dataItem)) {
            return { directiveType: 'list' };
          }

          return false;
        }

        function indexOfLongest(array) {
          var longest = 0;

          for (var i = 0; i < array.length; i++) {
            if (array[i].length >= array[longest].length) {
              longest = i;
            }
          }

          return longest;
        }

        function isDate(dataItem) {
          return moment(dataItem, moment.ISO_8601).isValid();
        }
      }
    }
  }
})();
