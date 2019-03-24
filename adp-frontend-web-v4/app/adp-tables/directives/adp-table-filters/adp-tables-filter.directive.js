;(function () {
  'use strict';
  
  angular
    .module('app.adpTables')
    .directive('adpTablesFilter', adpTablesFilter);
  
  function adpTablesFilter ($compile) {
    return {
      restrict: 'E',
      scope: {
        serverSide: '=',
        head: '=',
      },
      replace: true,
      link: function (scope, element) {
        scope.filterType = scope.head.filter.directiveType;

        var template = [
          '<adp-' + scope.filterType + '-filter',
            scope.serverSide ? 'server-side="serverSide"' : '',
          '>',
          '</adp-' + scope.filterType + '-filter>'
        ].join(' ');

        element.replaceWith($compile(template)(scope));
      }
    }
  }
})();
