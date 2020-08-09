;(function () {
  'use strict';

  angular
    .module('app.hcForms')
    .directive('hcHeightRequired', hcHeightRequired);

  function hcHeightRequired() {
    return {
      restrict: 'A',
      scope: false,
      require: 'ngModel',
      link: function (scope, element, attrs, ngModelCtrl) {
        var isRequired = scope.$eval(attrs.hcHeightRequired);
        if (!isRequired) return;

        ngModelCtrl.$validators.required = function (viewValue) {
          return viewValue[0] !== 0 || viewValue[1] !== 0;
        };
      }
    }
  }
})();
