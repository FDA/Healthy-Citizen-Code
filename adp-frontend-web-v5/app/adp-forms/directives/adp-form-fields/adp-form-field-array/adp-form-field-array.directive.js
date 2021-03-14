;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldArray', adpFormFieldArray);

  function adpFormFieldArray(visibilityUtils) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-array/adp-form-field-array.html',
      link: function (scope) {
        scope.hasVisibleItems = function () {
          return visibilityUtils.arrayHasVisibleChild(scope.args, scope.formContext);
        };
      }
    }
  }
})();
