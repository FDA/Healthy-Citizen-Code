(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldDynamicList', adpFormFieldDynamicList);

  function adpFormFieldDynamicList() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-dynamic-list/adp-form-field-dynamic-list.html'
    }
  }
})();
