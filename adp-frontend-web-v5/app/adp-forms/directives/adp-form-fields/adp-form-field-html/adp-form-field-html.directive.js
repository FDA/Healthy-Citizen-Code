(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldHtml', adpFormFieldHtml);

  function adpFormFieldHtml() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-html/adp-form-field-html.html',
    }
  }
})();
