;(function () {
  'use strict';
  
  angular
    .module('app.hcTables')
    .directive('hcTablesFilter', hcTablesFilter);
  
  function hcTablesFilter ($compile) {
    return {
      restrict: 'E',
      scope: {
        head: '=',
        listName: '=',
        serverSide: '=',
        schema: '='
      },
      replace: true,
      link: function (scope, element) {
        scope.filterType = scope.head.filter.directiveType;

        var template = [
          '<hc-' + scope.filterType + '-filter',
            scope.schema ? 'schema="schema"' : '',
            scope.listName ? 'list-name="listName"' : '',
            scope.serverSide ? 'server-side="serverSide"' : '',
            '>',
          '</hc-' + scope.filterType + '-filter>'
        ].join(' ');

        element.replaceWith($compile(template)(scope));
      }
    }
  }
})();
