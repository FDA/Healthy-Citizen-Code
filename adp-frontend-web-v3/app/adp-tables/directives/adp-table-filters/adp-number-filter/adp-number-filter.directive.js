;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .directive('adpNumberFilter', adpNumberFilter);

  function adpNumberFilter () {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        serverSide: '='
      },
      templateUrl: 'app/adp-tables/directives/adp-table-filters/adp-number-filter/adp-number-filter.html',
      link: function (scope, element) {
        var columnIndex = $(element).closest('th').index();
        var $min = $(element).find('.min');
        var $max = $(element).find('.max');

        if (!scope.serverSide) {
          applyDTFilters();
        }

        function applyDTFilters() {
          $.fn.dataTable.ext.search.push(numberFilter);
        }

        $(element).on('keyup change', 'input', function () {
          var searchParams = {
            index: columnIndex,
            serverSideParams: {
              filter: 'num',
              gt: $min.val(),
              lt: $max.val()
            }
          };

          scope.$emit('redraw', searchParams);
        });

        function numberFilter(settings, dataRow){
          var min = $min.val();
          var max = $max.val();
          var colValue = parseFloat(dataRow[columnIndex]);

          return isInRange(min, max, colValue);
        }

        // hide false
        // show true
        function isInRange(min, max, colValue) {
          if (!min && !max) {
            return true;
          }

          if (!min && colValue < max) {
            return true;
          }

          if (min <= colValue && !max) {
            return true;
          }

          if (min <= colValue && max > colValue) {
            return true;
          }

          return false;
        }
      }
    }
  }
})();
