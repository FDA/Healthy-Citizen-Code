(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldStringArray', adpFormFieldStringArray);

  function adpFormFieldStringArray() {
    return {
      restrict: 'E',
      scope: {
        adpField: '<',
        adpFormData: '<',
        adpFieldUiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-string-array/adp-form-string-array.html'
    }
  }
})();
