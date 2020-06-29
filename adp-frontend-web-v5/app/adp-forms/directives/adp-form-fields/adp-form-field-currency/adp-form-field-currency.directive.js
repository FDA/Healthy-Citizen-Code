(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldCurrency', adpFormFieldCurrency);

  function adpFormFieldCurrency() {
    return {
      restrict: 'E',
      scope: {
        adpField: '<',
        adpFormData: '<',
        adpFieldUiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-currency/adp-form-field-currency.html',
    }
  }
})();
