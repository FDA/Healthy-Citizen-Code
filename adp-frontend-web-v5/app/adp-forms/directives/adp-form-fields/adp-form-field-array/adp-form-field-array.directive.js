;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldArray', adpFormFieldArray);

  function adpFormFieldArray(visibilityUtils) {
    return {
      restrict: 'E',
      scope: {
        adpField: '<',
        adpFormData: '<',
        adpFieldUiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-array/adp-form-field-array.html',
      link: function (scope) {
        function getData() {
          return scope.adpFormData[scope.adpField.fieldName];
        }

        scope.hasVisibleItems = function () {
          return visibilityUtils.arrayHasVisibleChild(getData(), scope.validationParams);
        };
      }
    }
  }
})();
