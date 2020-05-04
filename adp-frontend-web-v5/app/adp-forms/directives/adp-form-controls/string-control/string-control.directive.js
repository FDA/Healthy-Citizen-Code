(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('stringControl', stringControl);

  function stringControl(
    AdpValidationUtils,
    AdpFieldsService
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/string-control/string-control.html',
      require: '^^form',
      link: function (scope) {
        function getData() {
          return scope.adpFormData[scope.field.fieldName];
        }

        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
        scope.config = {
          value: getData(),
          mode: getTextMode(),
          inputAttr: {
            autocomplete: AdpFieldsService.autocompleteValue(scope.field),
          },
          valueChangeEvent: 'input blur',
        }

        function getTextMode() {
          var types = {
            'Email': 'email',
            'PasswordAuth': 'password',
            'Url': 'url',
          };

          return types[scope.field.type] || 'text';
        }
      }
    }
  }
})();
