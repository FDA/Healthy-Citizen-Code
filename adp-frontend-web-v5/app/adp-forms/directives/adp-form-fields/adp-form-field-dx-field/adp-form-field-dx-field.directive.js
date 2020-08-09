(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldDxField', adpFormFieldDxField);

  function adpFormFieldDxField() {
    return {
      restrict: 'E',
      scope: {
        adpField: '<',
        adpFormData: '<',
        adpFieldUiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-dx-field/adp-form-field-dx-field.html',
    }
  }
})();
