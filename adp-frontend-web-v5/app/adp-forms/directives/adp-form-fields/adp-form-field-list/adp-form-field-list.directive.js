(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldList', adpFormFieldList);

  function adpFormFieldList() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-list/adp-form-field-list.html'
    }
  }
})();
