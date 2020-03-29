(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldCode', adpFormFieldCode);

  function adpFormFieldCode() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-code/adp-form-field-code.html',
    }
  }
})();
