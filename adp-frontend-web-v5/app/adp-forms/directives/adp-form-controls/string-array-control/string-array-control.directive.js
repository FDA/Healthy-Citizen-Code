(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('stringArrayControl', stringArrayControl);

  function stringArrayControl(
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
      templateUrl: 'app/adp-forms/directives/adp-form-controls/string-array-control/string-array-control.html',
      require: '^^form',
      link: function (scope) {
        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
        scope.config = getConfig(scope.field);

        function getConfig(field) {
          var defaults = getDefaults();
          return AdpFieldsService.configFromParameters(field, defaults);
        }

        function getDefaults() {
          return {
            elementAttr: {
              class: 'adp-select-box',
            },
            acceptCustomValue: true,
            placeholder: 'Type in new value and press Enter',
            openOnFieldClick: false,
            onValueChanged: onChange,
          };
        }

        function onChange(e) {
          if (_.isEmpty(e.value)) {
            scope.adpFormData[scope.field.fieldName] = null;
          }
        }
      }
    }
  }
})();
