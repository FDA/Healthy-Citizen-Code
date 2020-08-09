;(function () {
  'use strict';

  angular
    .module('app.hcTables')
    .directive('hcNumberFilter', hcNumberFilter);

  function hcNumberFilter () {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        serverSide: '='
      },
      templateUrl: 'app/hc-tables/directives/hc-table-filters/hc-number-filter/hc-number-filter.html',
      link: function (scope, element) {
        var columnIndex = $(element).closest('th').index();
        var $from = $(element).find('.from');
        var $to = $(element).find('.to');

        if (!scope.serverSide) applyDTFilters();

        $(element).on('keyup change', 'input', function () {
          var searchParams = {
            index: columnIndex,
            serverSideParams: {
              filter: 'num',
              gt: $from.val(),
              lt: $to.val()
            }
          };

          scope.$emit('redraw', searchParams);
        });

        function applyDTFilters() {
          $.fn.dataTable.ext.search.push(numberFilter);

          function numberFilter(settings, data){
            var fromVal = $from.val();
            var toVal = $to.val();
            var data = _.last(data[columnIndex].split(' ')) || '';
            data = parseFloat(data);

            return isInRange(fromVal, toVal, data);
          }

          function isInRange(fromVal, toVal, data) {
            return (( !fromVal && !toVal ) ||
            ( !fromVal && data < toVal ) ||
            ( fromVal <= data && !toVal ) ||
            ( fromVal <= data && data < toVal ));
          }
        };

      }
    }
  }
})();
