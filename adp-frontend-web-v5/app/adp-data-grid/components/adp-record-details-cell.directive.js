;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .directive('adpRecordDetailsCell', adpRecordDetailsCell);

  function adpRecordDetailsCell(HtmlCellRenderer) {
    return {
      restrict: 'E',
      scope: {
        args: '<'
      },
      link: function (scope, element) {
        var removeWatcher = scope.$watch('args', function (val) {
          if (_.isNil(val)) {
            return;
          }

          element.append(createTemplate(scope.args));
          removeWatcher();
        });

        function createTemplate(args) {
          var $wrapper = $('<div>', {
            'class': [
              'name-' + args.fieldSchema.fieldName,
              'view-details-cell-type-' + args.fieldSchema.type.toLowerCase(),
              getMixedAdditionalClassName(args),
            ].join(' '),
          });
          $wrapper.append(HtmlCellRenderer(args));

          return $wrapper;
        }

        function getMixedAdditionalClassName(args) {
          if (args.fieldSchema.type !== 'Mixed') {
            return '';
          }

          if (_.isNil(args.data) || typeof args.data !== 'object') {
            return 'view-details-cell-type-mixed-as-primitive'
          }

          return '';
        }
      }
    }
  }
})();
