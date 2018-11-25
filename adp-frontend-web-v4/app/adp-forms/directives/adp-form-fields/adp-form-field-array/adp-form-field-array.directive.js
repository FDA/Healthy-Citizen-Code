;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldArray', adpFormFieldArray);

  function adpFormFieldArray() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-array/adp-form-field-array.html'
    }
  }
})();
