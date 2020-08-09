;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .directive('adpBooleanFilter', adpBooleanFilter);

  function adpBooleanFilter () {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: 'app/adp-tables/directives/adp-table-filters/adp-boolean-filter/adp-boolean-filter.html',
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
