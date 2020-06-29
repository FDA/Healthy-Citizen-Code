(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('decimalControl', decimalControl);

  function decimalControl(
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
      templateUrl: 'app/adp-forms/directives/adp-form-controls/decimal-control/decimal-control.html',
      require: '^^form',
      link: function (scope) {
        if (_.isNil(getData())) {
          reset();
        }

        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
        scope.config = getConfig(scope.field);

        function getConfig(field) {
          return {
            mode: 'text',
            valueChangeEvent: 'blur input',
            inputAttr: {
              autocomplete: AdpFieldsService.autocompleteValue(field),
            },
            showSpinButtons: true,
            onKeyPress: function (e) {
              var isDecimalChar = /(\+|-|\.|(\d|e))/.test(e.event.key);
              if (!isDecimalChar) {
                e.event.preventDefault()
              }
            },
            onPaste: function (e) {
              e.event.preventDefault();
              var pasteText = e.event.originalEvent.clipboardData.getData('text');
              this.option('value', pasteText.replace(/[^0-9.\-+]/g, ''));
            },
          }
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
