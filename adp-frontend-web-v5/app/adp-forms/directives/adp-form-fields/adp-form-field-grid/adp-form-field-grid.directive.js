(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldGrid', adpFormFieldGrid);

  function adpFormFieldGrid() {
    return {
      restrict: 'E',
      scope: {
        adpField: '<',
        adpFormData: '<',
        adpFieldUiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-grid/adp-form-field-grid.html',
    }
  }
})();
