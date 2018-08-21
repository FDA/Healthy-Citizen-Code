;(function () {
  'use strict';
  
  angular
    .module('app.adpTables')
    .directive('adpListFilter', adpListFilter);
  
  function adpListFilter(
    AdpTablesSearchService,
    AdpFieldsService
  ) {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        listName: '=',
        serverSide: '='
      },
      templateUrl: 'app/adp-tables/directives/adp-table-filters/adp-list-filter/adp-list-filter.html',
      link: function (scope, element) {
        (function init() {
          scope.$select = $(element).find('select');
          scope.$select.select2();

          scope.list = AdpFieldsService.getListOfOptions(scope.listName);

          if (!scope.serverSide) {
            AdpTablesSearchService.addFilter(listFilter);
          }
          _bindEvents();
        })();

        function _bindEvents() {
          $(element).on('change keyup', 'select', scope.$emit.bind(scope, 'redraw'));
          scope.$on('$destroy', _onDestroy)
        }

        function _onDestroy() {
          scope.$select.select('destroy');
          scope.$select.remove();
        }

        function listFilter(_settings, data) {
          var $select = scope.$select;
          var values = $select.val();
          var columnIndex = $(element).closest('th').index();
          var data = _.first(data[columnIndex].split(' ')) || '';

          if (!values) return true;

          if (!data.split(',').length) {
            return _.indexOf(values, data) !== -1;
          } else {
            return _.intersection(data.split(','), values).length > 0;
          }
        }
      }
    }
  }
})();
