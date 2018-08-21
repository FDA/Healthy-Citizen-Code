;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .directive('adpDateFilter', adpDateFilter);

  function adpDateFilter (BS_DATE_FORMAT) {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        serverSide: '='
      },
      templateUrl: 'app/adp-tables/directives/adp-table-filters/adp-date-filter/adp-date-filter.html',
      link: function (scope, element) {

        scope.datepickerOptions = {
          dateFormat: BS_DATE_FORMAT,
          changeMonth: true,
          changeYear: true,
          showOn: 'button',
          buttonText: ' '
        };

        var columnIndex = $(element).closest('th').index();
        var $before = $(element).find('input.before');
        var $after = $(element).find('input.after');

        if (!scope.serverSide) applyDTFilter();

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

        $(element).on('change', 'input', function () {
          var searchParams = {
            index: columnIndex,
            serverSideParams: {
              filter: 'date',
              gt: $before.val(),
              lt: $after.val()
            }
          };

          scope.$emit('redraw', searchParams);
        });
      }
    }
  }
})();
