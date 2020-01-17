;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .directive('adpRecordDetailsCell', adpRecordDetailsCell);

  function adpRecordDetailsCell() {
    return {
      restrict: 'E',
      scope: {
        template: '=',
      },
      link: function (scope, element) {
        element.append(scope.template);
      }
    }
  }
})();
