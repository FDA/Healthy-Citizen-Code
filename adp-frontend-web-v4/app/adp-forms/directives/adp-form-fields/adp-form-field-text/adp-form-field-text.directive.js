(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldText', adpFormFieldText);

  function adpFormFieldText() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-text/adp-form-field-text.html'
    }
  }
})();
