;(function () {
  'use strict';

  angular
    .module('app.hcTables')
    .directive('hcTable', hcTable);

  function hcTable($compile) {
    return {
      restrict: 'E',
      scope: {
        schema: '=',
        data: '=',
        hasDetails: '=',
        filteredData: '=',
        url: '=',
        update: '=',
        delete: '='
      },
      replace: true,
      link: function (scope, element) {
        scope.tableType = scope.schema.serverSide ? 'server-side' : 'regular';

        var template = [
          '<hc-table-' + scope.tableType + ' ',
            'schema="schema" ',
            'data="data" ',
            'has-details="hasDetails" ',
            'url="url" ',
            scope.filteredData ? 'filtered-data="filteredData" ' : '',
            'delete="delete" ',
            'update="update">',
          '</hc-table-' + scope.tableType + '>'
        ].join('');

        element.replaceWith($compile(template)(scope));
      }
    }
  }
})();
