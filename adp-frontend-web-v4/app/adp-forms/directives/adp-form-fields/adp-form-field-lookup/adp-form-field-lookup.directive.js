(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldLookup', adpFormFieldLookup);

  function adpFormFieldLookup() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-lookup/adp-form-field-lookup.html'
    }
  }
})();
