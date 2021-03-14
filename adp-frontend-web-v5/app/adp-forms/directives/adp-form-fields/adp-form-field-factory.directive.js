;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldFactory', adpFormFieldFactory);

  function adpFormFieldFactory(
    $compile,
    AdpFieldsService,
    AdpPath,
    AdpUnifiedArgs
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
        fieldName: '<',
        index: '<?',
      },
      compile: function () {
        return function (scope, element) {
          scope.nextArgs = AdpUnifiedArgs.next(
            scope.args,
            scope.fieldName,
            scope.index
          );

          scope.formContext.visibilityMap[scope.nextArgs.path] = true;
          scope.display = function() {
            return scope.formContext.visibilityMap[scope.nextArgs.path];
          };

          if (scope.args.action === 'create') {
            var unbind = scope.$watch('args.action', function (newVal) {
              if (newVal !== 'update') {
                return;
              }

              scope.nextArgs.action = scope.args.action;
              unbind();
            });
          }

          var fieldWidth = _.get(scope, 'nextArgs.fieldSchema.formWidth', 12);
          var className = 'col col-' + fieldWidth;

          var directiveType = AdpFieldsService.getDirectiveType(scope.nextArgs.fieldSchema);

          var template = [
            '<adp-form-field-' + directiveType,
              'class="' + className + '"',
              'ng-if="display()"',
              'args="::nextArgs"',
              'form-context="::formContext"',
              'ng-attr-adp-qaid-field="{{nextArgs.path}}"',
            '>',
            '</adp-form-field-' + directiveType + '>'
          ].join(' ');

          element.replaceWith($compile(template)(scope));
        }
      }
    }
  }
})();
