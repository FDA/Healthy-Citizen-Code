;(function () {
  'use strict';

  angular
    .module('app.hcTables')
    .directive('hcTableClientSide', hcTableClientSide);

  function hcTableClientSide(DATE_FORMAT) {
    return {
      restrict: 'E',
      scope: {
        data: '=',
      },
      replace: true,
      templateUrl: 'app/hc-tables/directives/hc-table-client-side/hc-table-client-side.html',
      link: function (scope, element) {
        var otable;

        function init() {
          var heads = getHeads(scope.data.summaryData);
          var data = getDataSet(scope.data.summaryData, heads);
          var columns = getColumns(heads);
          scope.filters = getFilters(scope.data.summaryData);

          otable = element.DataTable({
            data: data,
            columns: columns
          });

          bindEvents();
        }
        init();

        function bindEvents() {
          scope.$on('filterChanged', handleFilters);
          scope.$on('redraw', otable.draw);

          scope.$on('$destroy', function() {
            $.fn.dataTable.ext.search = [];
            $(element).DataTable().destroy();
          });
        }

        function handleFilters(event, searchParams) {
          otable
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
            var title = item.replace(/[A-Z]/g, function (letter) {
              return ' ' + letter.toLowerCase();
            });

            return { title: title };
          });
        }

        function getDataSet(tableData, heads) {
          return _.map(tableData, function (dataRow) {
            return _.map(heads, function (head) {
              var dataItem = dataRow[head] || '-';

              return isDate(dataItem) ? moment(dataItem).format(DATE_FORMAT) : dataItem;
            });
          });
        }

        function getFilters(tableData) {
          var longestItem = indexOfLongest(tableData);

          return _.map(tableData[longestItem], function (item) {
            return {
              filter: { directiveType: getDataType(item) }
            };
          });
        }

        function getDataType(dataItem) {
          // order is important because date string and string are the same data types
          if (isDate(dataItem)) {
            return 'date'
          }

          if (_.isString(dataItem)) {
            return 'string';
          }

          if (_.isNumber(dataItem)) {
            return 'number';
          }

          if (_.isArray(dataItem)) {
            return 'list'
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
