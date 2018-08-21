;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldCheckbox', adpFormFieldCheckbox);

  function adpFormFieldCheckbox() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-checkbox/adp-form-field-checkbox.html'
    }
  }
})();
