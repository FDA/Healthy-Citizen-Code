(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('intNumberControl', intNumberControl);

  function intNumberControl(
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
      templateUrl: 'app/adp-forms/directives/adp-form-controls/int-number-control/int-number-control.html',
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
            format: '#',
            inputAttr: {
              autocomplete: AdpFieldsService.autocompleteValue(field),
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
