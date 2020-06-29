(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('numberControl', numberControl);

  function numberControl(
    AdpValidationUtils,
    AdpFieldsService
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '<',
        adpFormData: '<',
        uiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/number-control/number-control.html',
      require: '^^form',
      link: function (scope) {
        if (_.isNil(getData())) {
          reset();
        }

        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
        scope.config = getConfig(scope.field);

        function getConfig(field) {
          var defaults = {
            valueChangeEvent: 'blur input',
            inputAttr: {
              autocomplete: AdpFieldsService.autocompleteValue(scope.field),
            },
            showSpinButtons: true,
          };

          return AdpFieldsService.configFromParameters(field, defaults);
        }

        function getData() {
          return scope.adpFormData[scope.field.fieldName];
        }

        function reset() {
          scope.adpFormData[scope.field.fieldName] = null;
        }
      }
    }
  }
})();
