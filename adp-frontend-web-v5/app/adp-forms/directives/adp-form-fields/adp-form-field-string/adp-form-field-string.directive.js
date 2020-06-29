(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldString', adpFormFieldString);

  function adpFormFieldString() {
    return {
      restrict: 'E',
      scope: {
        adpField: '<',
        adpFormData: '<',
        adpFieldUiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-string/adp-form-field-string.html',
    }
  }
})();
