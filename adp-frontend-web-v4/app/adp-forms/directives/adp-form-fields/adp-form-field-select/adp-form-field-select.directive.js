(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldSelect', adpFormFieldSelect);

  function adpFormFieldSelect() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-select/adp-form-field-select.html'
    }
  }
})();
