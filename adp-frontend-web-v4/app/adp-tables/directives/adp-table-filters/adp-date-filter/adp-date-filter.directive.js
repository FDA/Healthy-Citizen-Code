;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .directive('adpDateFilter', adpDateFilter);

  function adpDateFilter (BS_DATE_FORMAT) {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: 'app/adp-tables/directives/adp-table-filters/adp-date-filter/adp-date-filter.html',
      link: function (scope, element) {
        var columnIndex = $(element).closest('th').index();
        var $before = $(element).find('input.before');
        var $after = $(element).find('input.after');

        scope.datepickerOptions = {
          dateFormat: BS_DATE_FORMAT,
          changeMonth: true,
          changeYear: true,
          showOn: 'button',
          buttonText: ' '
        };

        _setValueFromUrl();

        if (!scope.serverSide) applyDTFilter();

        $(element).on('change', 'input', function (e) {
          var searchParams = {
            index: columnIndex,
            serverSideParams: {
              filter: 'date',
              gt: $before.val(),
              lt: $after.val()
            }
          };

          _setFilterToUrl();
          scope.$emit('redraw', searchParams);
        });

        function applyDTFilter() {
          $.fn.dataTable.ext.search.push(filterDate);

          function filterDate(settings, data){
            var beforeVal = $before.val();
            var afterVal = $after.val();
            var date = _.last(data[columnIndex].split(' ')) || '';

            if (!beforeVal && !afterVal) return true;

            if (!beforeVal && afterVal) {
              return moment(date).isSameOrBefore(afterVal);
            }

            if (!afterVal && beforeVal) {
              return moment(date).isSameOrAfter(beforeVal);
            }

            return moment(date).isBetween(beforeVal, afterVal, null, '[]');
          }
        }

        function _setFilterToUrl() {
          var min = $before.val();
          var max = $after.val();

          scope.head.from = min ? min : null;
          scope.head.to = max ? max : null;
        }

        function _setValueFromUrl() {
          var min = scope.head.from;
          var max = scope.head.to;

          min && $before.val(min);
          max && $after.val(max);
        }
      }
    }
  }
})();
