;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .directive('adpStringFilter', adpStringFilter);

  function adpStringFilter(AdpTablesSearchService) {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: 'app/adp-tables/directives/adp-table-filters/adp-string-filter/adp-string-filter.html',
      link: function (scope, element) {
        var $select = $(element).find('select');
        var $input = $(element).find('input');

        setDisabled(true);

        $(element).on('keyup change paste', 'input', _stringFilterHandler);
        $(element).on('change', 'select', _selectOptionHandler);

        _setDataFromQueryParams();

        function _stringFilterHandler() {
          var columnIndex = $(element).closest('th').index();
          var field = scope.head.field;

          var input = $input.val();

          var searchOption = $select.val();
          var searchRegex = AdpTablesSearchService.getSearchRegex(input, field, searchOption);
          _setFilterData();

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

        function _selectOptionHandler() {
          var searchOption = $select.val();
          var disabled = (searchOption === 'any');
          setDisabled(disabled);
        }

        function setDisabled(isDisabled) {
          if (isDisabled) {
            $input.val('');
          }
          $input.attr('disabled', isDisabled);
          $input.trigger('change');
        }

        function _setFilterData() {
          var input = $input.val();
          var searchOption = $select.val();

          scope.head.data = input === '' ? null : input;
          scope.head.searchOption = searchOption === 'any' ? null : searchOption;
        }

        function _setDataFromQueryParams() {
          var options = [
            'contains',
            'startsWith',
            'endsWith',
            'equal',
          ];
          var option = scope.head.searchOption;
          var data = scope.head.data;

          if (!_.isNil(data)) {
            $input.val(data);
          }

          if (options.includes(option)) {
            $select.val(option);
            setDisabled(false);
          }
        }
      }
    }
  }
})();
