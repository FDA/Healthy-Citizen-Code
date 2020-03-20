(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldIntNumber', adpFormFieldIntNumber);

  function adpFormFieldIntNumber() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-int-number/adp-form-field-int-number.html',
    }
  }
})();
