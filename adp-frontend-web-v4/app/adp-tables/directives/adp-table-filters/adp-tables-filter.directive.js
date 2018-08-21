;(function () {
  'use strict';
  
  angular
    .module('app.adpTables')
    .directive('adpTablesFilter', adpTablesFilter);
  
  function adpTablesFilter ($compile) {
    return {
      restrict: 'E',
      scope: {
        schema: '=',
        listName: '=',
        serverSide: '=',
        subtype: '=?',
        head: '=',
      },
      replace: true,
      link: function (scope, element) {
        scope.filterType = scope.head.filter.directiveType;
        scope.subtype = scope.head.filter.uiSubtypeType;

        var template = [
          '<adp-' + scope.filterType + '-filter',
            scope.schema ? 'schema="schema"' : '',
            scope.listName ? 'list-name="listName"' : '',
            scope.serverSide ? 'server-side="serverSide"' : '',
            scope.subtype ? 'subtype="subtype"' : '',
          '>',
          '</adp-' + scope.filterType + '-filter>'
        ].join(' ');

        element.replaceWith($compile(template)(scope));
      }
    }
  }
})();
