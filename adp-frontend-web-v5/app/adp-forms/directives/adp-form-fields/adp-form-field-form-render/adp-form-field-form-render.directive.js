(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldFormRender', adpFormFieldString);

  function adpFormFieldString() {
    return {
      restrict: 'E',
      scope: {
        adpField: '<',
        adpFormData: '<',
        adpFieldUiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-form-render/adp-form-field-form-render.html'
    }
  }
})();
