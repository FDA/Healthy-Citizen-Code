(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('stringArrayControl', stringArrayControl);

  function stringArrayControl(AdpValidationUtils) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/string-array-control/string-array-control.html',
      require: '^^form',
      link: function (scope) {
        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
        scope.config = {
          elementAttr: {
            class: 'adp-select-box',
          },
          value: scope.adpFormData[scope.field.fieldName],
          acceptCustomValue: true,
          placeholder: 'Type in new value and press Enter',
          openOnFieldClick: false,
          onValueChanged: function (e) {
            if (e.value && e.value.length === 0) {
              scope.adpFormData[scope.field.fieldName] = null;
            }
          }
        }
      }
    }
  }
})();
