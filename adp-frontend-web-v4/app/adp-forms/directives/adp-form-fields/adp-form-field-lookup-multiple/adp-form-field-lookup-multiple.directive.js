(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldLookupMultiple', adpFormFieldLookupMultiple);

  function adpFormFieldLookupMultiple() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-lookup-multiple/adp-form-field-lookup-multiple.html'
    }
  }
})();
