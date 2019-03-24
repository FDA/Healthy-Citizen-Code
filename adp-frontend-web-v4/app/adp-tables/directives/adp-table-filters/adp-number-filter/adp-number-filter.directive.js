;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .directive('adpNumberFilter', adpNumberFilter);

  function adpNumberFilter () {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: 'app/adp-tables/directives/adp-table-filters/adp-number-filter/adp-number-filter.html',
      link: function (scope, element) {
        var columnIndex = $(element).closest('th').index();
        var $min = $(element).find('.min');
        var $max = $(element).find('.max');
        _setValueFromUrl();

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
          _setFilterToUrl();

          scope.$emit('redraw', searchParams);
        });

        function numberFilter(settings, dataRow){
          var min = $min.val();
          var max = $max.val();
          var colValue = Number(dataRow[columnIndex]);

          return isInRange(min, max, colValue);
        }

        // hide false
        // show true
        function isInRange(min, max, colValue) {
          if (!min && !max) {
            return true;
          }
          min = min || Number.MIN_SAFE_INTEGER;
          max = max || Number.MAX_SAFE_INTEGER;

          return _.inRange(colValue, min, max);
        }

        function _setFilterToUrl() {
          var min = $min.val();
          var max = $max.val();

          scope.head.from = min ? min : null;
          scope.head.to = max ? max : null;
        }

        function _setValueFromUrl() {
          var min = scope.head.from;
          var max = scope.head.to;

          min && $min.val(min);
          max && $max.val(max);
        }
      }
    }
  }
})();
