;(function () {
  'use strict';

  angular
    .module('app.hcForms')
    .directive('hcValidate', hcValidate);

  function hcValidate(HcValidationService) {
    return {
      restrict: 'A',
      scope: false,
      require: ['ngModel', '^^form'],
      link: function (scope, element, attrs, ctrls) {
        scope.model = ctrls[0];
        scope.form = ctrls[1];
        scope.model.$validators = scope.model.$validators || {};
        scope.field = scope.$eval(attrs.hcValidate);

        var validate = scope.field.validate;

        if (validate && validate.length) {
          HcValidationService.addValidators(scope.field, scope.form);
        }
      }
    }
  }
})();
