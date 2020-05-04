(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('textControl', textControl);

  function textControl(
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
      templateUrl: 'app/adp-forms/directives/adp-form-controls/text-control/text-control.html',
      require: '^^form',
      link: function (scope) {
        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);

        scope.config = {
          value: getData(),
          inputAttr: {
            autocomplete: AdpFieldsService.autocompleteValue(scope.field),
            id: scope.field.fieldName,
          },
          minHeight: '80px',
          autoResizeEnabled: true,
          valueChangeEvent: 'input blur',
        }

        function getData() {
          return scope.adpFormData[scope.field.fieldName];
        }
      }
    }
  }
})();
