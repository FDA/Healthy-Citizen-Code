(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('currencyControl', currencyControl);

  function currencyControl(
    AdpValidationUtils,
    AdpFieldsService,
    DX_ACCOUNTING_FORMAT
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '<',
        adpFormData: '<',
        uiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/currency-control/currency-control.html',
      require: '^^form',
      link: function (scope) {
        if (_.isNil(getData())) {
          reset();
        }

        scope.config = getConfig(scope.field);
        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);

        function getConfig(field) {
          var defaults = {
            valueChangeEvent: 'blur keyup change',
            onValueChanged: function (e) {
              if (e.value === 0 && _.isNumber(e.previousValue)) {
                // update fired on next change event
                e.component.option('value', null);
              }
            },
            inputAttr: {
              autocomplete: AdpFieldsService.autocompleteValue(scope.field),
            },
            showSpinButtons: true,
            format: DX_ACCOUNTING_FORMAT,
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
