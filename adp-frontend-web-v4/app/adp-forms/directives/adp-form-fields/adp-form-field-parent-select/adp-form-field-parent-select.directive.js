(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldParentSelect', adpFormFieldParentSelect);

  function adpFormFieldParentSelect() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-parent-select/adp-form-field-parent-select.html',
      link: function (scope) {
        scope.field = scope.adpField;

        // hiding search input
        // https://github.com/select2/select2/issues/489#issuecomment-100602293
        if (scope.field.parentData.length < 10) {
          scope.options = {
            minimumResultsForSearch: -1
          }
        }
      }
    }
  }
})();