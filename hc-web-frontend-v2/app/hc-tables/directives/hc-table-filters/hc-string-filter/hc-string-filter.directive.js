;(function () {
  'use strict';

  angular
    .module('app.hcTables')
    .directive('hcStringFilter', hcStringFilter);

  function hcStringFilter () {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: 'app/hc-tables/directives/hc-table-filters/hc-string-filter/hc-string-filter.html',
      link: function (scope, element) {
        var searchStrategy = {
          'any': function () {
            return '';
          },
          'contains': function (input) {
            return input;
          },
          'startsWith': function (input) {
            return '^' + input;
          },
          'endsWith': function (input) {
            return input + '$';
          },
          'equal': function (input) {
            return '^' + input + '$';
          }
        };

        var $select = $(element).find('select');
        var $input = $(element).find('input');

        setDisabled(true);

        $(element).on('keyup change', 'input, select', stringFilter);

        function stringFilter() {
          var columnIndex = $(element).closest('th').index();
          var searchOption = $select.val();
          var searchRegex = searchStrategy[searchOption]($input.val());

          var disabled = (searchOption === 'any');
          setDisabled(disabled);

          var searchParams = {
            columnIndex: columnIndex,
            searchString: searchRegex,
            isRegex: true,
            serverSideParams: {
              filter: 'string',
              type: $select.val(),
              val: $input.val()
            }
          };

          scope.$emit('filterChanged', searchParams);
        }

        function setDisabled(isDisabled) {
          if (isDisabled) {
            $input.val('');
          }
          $input.attr('disabled', isDisabled);
        }
      }
    }
  }
})();
