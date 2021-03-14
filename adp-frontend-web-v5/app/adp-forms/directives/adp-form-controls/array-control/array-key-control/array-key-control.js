;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('arrayKeyControl', arrayKeyControl);

  function arrayKeyControl() {
    return {
      restrict: 'E',
      scope: {
        args: '=',
        arrayItem: '=',
        index: '=',
        formContext: '=',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/array-control/array-key-control/array-key-control.html',
      require: '^^form',
      link: function (scope) {
        scope.keyField = {
          type: 'String',
          fieldName: '$key',
          fullName: 'Key',
          autocomplete: 'disable',
          validate: [{
            validator: 'associativeArrayKeyUnique',
            errorMessages: {
              default: 'The "key" must be unique',
            }
          }, {
            validator: 'schemaKeyRegExp',
            errorMessages: {
              default: 'Key must start from latin letter or underscore. Other Key characters must contain latin letters, numbers and underscores only.',
            }
          }],
        };

        scope.arrayKeyArgs = {
          fieldSchema: scope.keyField,
          row: scope.args.row,
          path: getPath(),
        }

        scope.formContext.requiredMap[getPath()] = true;

        scope.isKeyRequired = function () {
          return scope.formContext.requiredMap[getPath()];
        }

        function getPath() {
          return scope.args.path + '[' + scope.index + '].$key';
        }
      }
    }
  }
})();
