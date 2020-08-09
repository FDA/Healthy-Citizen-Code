;(function () {
  'use strict';

  angular
    .module('app.hcTables')
    .directive('hcBooleanFilter', hcBooleanFilter);

  function hcBooleanFilter () {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: 'app/hc-tables/directives/hc-table-filters/hc-boolean-filter/hc-boolean-filter.html',
      link: function (scope, element) {
        var searchStrategy = {
          'any': '',
          'yes': true,
          'no': false
        };

        var $select = $(element).find('select');
        var columnIndex = $(element).closest('th').index();

        $(element).on('change', 'select', function () {
          var searchValue = searchStrategy[$select.val()];
          var searchParams = {
            columnIndex: columnIndex,
            isRegex: false,
            searchString: searchValue,
            serverSideParams: {
              filter: 'boolean',
              val: searchValue
            }
          };

          scope.$emit('filterChanged', searchParams);
        });
      }
    }
  }
})();
