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
        var subtype = scope.subtype;

        setDisabled(true);

        $(element).on('keyup change paste', 'input', stringFilterHandler);
        $(element).on('change', 'select', selectOptionHandler);

        function stringFilterHandler(e) {
          // var clipBoardData = e.originalEvent.clipboardData;
          var columnIndex = $(element).closest('th').index();

          // if (clipBoardData) {
          //   $input.val(clipBoardData.getData('text').replace(/[\n\r]g/, '\s'));
          //   return $input.trigger('change');
          // }
          var input = $input.val();

          var searchOption = $select.val();
          var searchRegex = AdpTablesSearchService.getSearchRegex(input, subtype, searchOption);

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

        function selectOptionHandler() {
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
      }
    }
  }
})();
