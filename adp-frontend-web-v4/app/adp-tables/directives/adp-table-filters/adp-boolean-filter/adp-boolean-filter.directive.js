;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .directive('adpBooleanFilter', adpBooleanFilter);

  function adpBooleanFilter ($timeout) {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: 'app/adp-tables/directives/adp-table-filters/adp-boolean-filter/adp-boolean-filter.html',
      link: function (scope, element) {
        var $select = $(element).find('select');
        var columnIndex = $(element).closest('th').index();

        (function init() {
          $(element).on('change', 'select', onChange);
          $timeout(_setData);
        })();

        function onChange() {
          var selectValue = _getSelectValue();
          _setDataToUrl(selectValue);

          var searchParams = {
            columnIndex: columnIndex,
            isRegex: false,
            searchString: selectValue,
            serverSideParams: {
              filter: 'boolean',
              val: selectValue
            }
          };
          scope.$emit('filterChanged', searchParams);
        }

        function _getSelectValue() {
          var searchStrategy = {
            'any': '',
            'yes': true,
            'no': false
          };

          return searchStrategy[$select.val()];
        }

        function _setDataToUrl(value) {
          if (_.isBoolean(value)) {
            scope.head.data = value ? 1 : 0;
          } else {
            scope.head.data = null;
          }
        }

        function _setData() {
          if (_.isNil(scope.head.data)) {
            return;
          }

          var valueToSet = scope.head.data === '1' ? 'yes' : 'no';
          $select.val(valueToSet);
          $select.trigger('change');
        }
      }
    }
  }
})();
