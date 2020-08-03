;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('arrayKeyControl', arrayKeyControl);

  function arrayKeyControl() {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        formData: '=',
        validationParams: '=',
        index: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/array-control/array-key-control/array-key-control.html',
      require: '^^form',
      link: function (scope) {
        var arrayFieldFormParams = scope.validationParams.formParams;
        var requiredMap = arrayFieldFormParams.requiredMap;
        requiredMap[arrayKeyPath()] = true;

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

        scope.arrayKeyValidationParams = {
          field: scope.keyField,
          formData: scope.formData,
          formParams: {
            path: scope.validationParams.formParams.path,
          }
        }


        // use required map here
        scope.isKeyRequired = function () {
          return requiredMap[arrayKeyPath()];
        }

        function arrayKeyPath() {
          return arrayFieldFormParams.path + '[' + scope.index + '].$key';
        }
      }
    }
  }
})();
