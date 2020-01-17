(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldLocation', adpFormFieldLocation);

  function adpFormFieldLocation() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-location/adp-form-field-location.html'
    }
  }
})();
