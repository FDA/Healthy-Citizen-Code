(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldDynamicListMultiple', adpFormFieldDynamicListMultiple);

  function adpFormFieldDynamicListMultiple() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-dynamic-list-multiple/adp-form-field-dynamic-list-multiple.html'
    }
  }
})();
