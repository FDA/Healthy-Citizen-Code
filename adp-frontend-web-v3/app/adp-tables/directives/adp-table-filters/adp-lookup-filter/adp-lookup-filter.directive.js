;(function () {
  'use strict';
  
  angular
    .module('app.adpTables')
    .directive('adpLookupFilter', adpLookupFilter);
  
  function adpLookupFilter(
    AdpTablesSearchService,
    CONSTANTS
  ) {
    return {
      restrict: 'E',
      scope: {
        schema: '='
      },
      templateUrl: 'app/adp-tables/directives/adp-table-filters/adp-lookup-filter/adp-lookup-filter.html',
      link: function (scope, element) {
        scope.filterValue = [];

        var columnIndex = $(element).closest('th').index();

        var options = {
          multiple: true,
          nextSearchTerm: function (selected) {
            if (selected && selected.length) {
              return selected.label;
            }

            return '';
          },
          formatResult: function(state) {
            return state.label;
          },
          formatSelection: function(state) {
            return state.label;
          },
          ajax: {
            url: CONSTANTS.apiUrl + '/lookups/' + scope.schema.lookup.id,
            dataType: 'json',
            quietMillis: 300,
            data: function (term, page) {
              return { q: term, page: page };
            },
            results: function (response) {
              return { results: response.data, more: response.more };
            },
            cache: true
          }
        };

        var $select = $(element).find('.form-control');
        $select.select2(options);

        $(element).on('change keyup', '.form-control', function () {
          var selectedNodes = $(element).find('.select2-search-choice div');
          var values = $.map(selectedNodes, function (option) {
            return AdpTablesSearchService.escapeRegexChars($(option).text().trim());
          });

          var searchParams = {
            columnIndex: columnIndex,
            searchString: values.join('|'),
            isRegex: true
          };

          scope.$emit('filterChanged', searchParams);
        });

      }
    }
  }
})();
