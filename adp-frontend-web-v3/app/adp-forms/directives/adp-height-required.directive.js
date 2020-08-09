;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpHeightRequired', adpHeightRequired);

  function adpHeightRequired() {
    return {
      restrict: 'A',
      scope: false,
      require: 'ngModel',
      link: function (scope, element, attrs, ngModelCtrl) {
        var isRequired = scope.$eval(attrs.adpHeightRequired);
        if (!isRequired) return;

        ngModelCtrl.$validators.required = function (viewValue) {
          return viewValue[0] !== 0 || viewValue[1] !== 0;
        };
      }
    }
  }
})();
