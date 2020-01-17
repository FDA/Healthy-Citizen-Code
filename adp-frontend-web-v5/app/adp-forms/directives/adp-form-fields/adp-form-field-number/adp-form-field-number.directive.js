(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldNumber', adpFormFieldNumber);

  function adpFormFieldNumber() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-number/adp-form-field-number.html',
    }
  }
})();
