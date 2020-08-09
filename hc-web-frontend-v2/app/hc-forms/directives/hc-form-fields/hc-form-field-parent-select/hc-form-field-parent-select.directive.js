(function () {
  'use strict';

  angular
    .module('app.hcForms')
    .directive('hcFormFieldParentSelect', hcFormFieldParentSelect);

  function hcFormFieldParentSelect() {
    return {
      restrict: 'E',
      scope: {
        hcField: '=',
        hcFormData: '='
      },
      templateUrl: 'app/hc-forms/directives/hc-form-fields/hc-form-field-parent-select/hc-form-field-parent-select.html',
      link: function (scope) {
        scope.field = scope.hcField;

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