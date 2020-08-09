;(function () {
  'use strict';
  
  angular
    .module('app.hcTables')
    .directive('hcLookupFilter', hcLookupFilter);
  
  function hcLookupFilter(CONSTANTS) {
    return {
      restrict: 'E',
      scope: {
        schema: '='
      },
      templateUrl: 'app/hc-tables/directives/hc-table-filters/hc-lookup-filter/hc-lookup-filter.html',
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
          var values = $.map($(element).find(".select2-search-choice div"), function (option) {
            return $(option).text().replace(/\s/g, '\\s');
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
