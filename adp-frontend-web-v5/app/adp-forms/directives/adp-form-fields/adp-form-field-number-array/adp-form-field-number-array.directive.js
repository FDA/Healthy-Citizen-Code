(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldNumberArray', adpFormFieldNumberArray);

  function adpFormFieldNumberArray() {
    return {
      restrict: 'E',
      scope: {
        adpField: '<',
        adpFormData: '<',
        adpFieldUiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-number-array/adp-form-field-number-array.html'
    }
  }
})();
