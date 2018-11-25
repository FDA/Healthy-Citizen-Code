(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldSelectMultiple', adpFormFieldSelectMultiple);

  function adpFormFieldSelectMultiple() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-select-multiple/adp-form-field-select-multiple.html'
    }
  }
})();
