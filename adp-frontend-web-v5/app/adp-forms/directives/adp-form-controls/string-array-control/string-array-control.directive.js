(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('stringArrayControl', stringArrayControl);

  function stringArrayControl(
    StringArrayEditorConfig,
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
          var fieldData = scope.adpFormData[scope.field.fieldName];
          var defaults = StringArrayEditorConfig(fieldData, updateModel);
          return AdpFieldsService.configFromParameters(field, defaults);
        }

        function updateModel(valueObj) {
          scope.adpFormData[scope.field.fieldName] = valueObj.value;
        }
      }
    }
  }
})();
