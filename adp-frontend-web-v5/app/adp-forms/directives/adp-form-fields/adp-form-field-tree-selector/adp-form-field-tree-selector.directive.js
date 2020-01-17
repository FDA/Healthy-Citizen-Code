(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldTreeSelector', adpFormFieldTreeSelector);

  function adpFormFieldTreeSelector() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-tree-selector/adp-form-field-tree-selector.html'
    }
  }
})();
