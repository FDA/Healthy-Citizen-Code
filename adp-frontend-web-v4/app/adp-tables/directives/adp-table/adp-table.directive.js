;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .directive('adpTable', adpTable);

  function adpTable($compile) {
    return {
      restrict: 'E',
      scope: {
        schema: '=',
        data: '=',
        filteredData: '=',
        url: '=',
        actions: '=',
        actionCbs: '='
      },
      replace: true,
      link: function (scope, element) {
        scope.tableType = scope.schema.serverSide ? 'server-side' : 'regular';

        var template = [
          '<adp-table-' + scope.tableType,
            'schema="schema"',
            'data="data"',
            'url="url"',
            scope.actions ? 'actions="actions"' : '',
            scope.filteredData ? 'filtered-data="filteredData"' : '',
            scope.actionCbs ? 'action-cbs="actionCbs"' : '',
          '>',
          '</adp-table-' + scope.tableType + '>'
        ].join(' ');

        element.replaceWith($compile(template)(scope));
      }
    }
  }
})();
