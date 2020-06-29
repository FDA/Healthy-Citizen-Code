;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldBoolean', adpFormFieldBoolean);

  function adpFormFieldBoolean() {
    return {
      restrict: 'E',
      scope: {
        adpField: '<',
        adpFormData: '<',
        adpFieldUiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-boolean/adp-form-field-boolean.html'
    }
  }
})();
