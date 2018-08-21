(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldImperialUnits', adpFormFieldImperialUnits);

  function adpFormFieldImperialUnits() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-imperial-units/adp-form-field-imperial-units.html'
    }
  }
})();
