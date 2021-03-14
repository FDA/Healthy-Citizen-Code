(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('schemaKeyRegExp', schemaKeyRegExp);

  function schemaKeyRegExp() {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function (scope, el, attrs, ctrl) {
        ctrl.$validators.schemaKeyRegExp = function(modelValue) {
          var keyRegex = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
          return ctrl.$isEmpty(modelValue) || keyRegex.test(modelValue);
        };
      }
    }
  }
})();
