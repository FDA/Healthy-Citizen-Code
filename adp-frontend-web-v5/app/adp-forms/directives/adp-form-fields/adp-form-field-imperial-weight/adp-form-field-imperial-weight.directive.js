(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldImperialWeight', adpFormFieldImperialWeight);

  function adpFormFieldImperialWeight() {
    return {
      restrict: 'E',
      scope: {
        adpField: '<',
        adpFormData: '<',
        adpFieldUiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-imperial-weight/adp-form-field-imperial-weight.html'
    }
  }
})();
