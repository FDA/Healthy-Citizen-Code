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
        var removeWatcher = scope.$watch('template', function (val) {
          if (_.isNil(val)) {
            return;
          }

          element.append(scope.template);
          removeWatcher();
        });
      }
    }
  }
})();
