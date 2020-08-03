(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldDecimalArray', adpFormFieldDecimalArray);

  function adpFormFieldDecimalArray() {
    return {
      restrict: 'E',
      scope: {
        adpField: '<',
        adpFormData: '<',
        adpFieldUiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-decimal-array/adp-form-field-decimal-array.html'
    }
  }
})();
