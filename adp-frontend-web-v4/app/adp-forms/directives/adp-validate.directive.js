;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpValidate', adpValidate);

  function adpValidate(AdpValidationService) {
    return {
      restrict: 'A',
      scope: false,
      require: ['ngModel', '^^form'],
      link: function (scope, element, attrs, ctrls) {
        var unbind = scope.$watch(attrs.adpValidate, function(field) {
          init();
          extendValidators(field);
          unbind();
        });

        function init() {
          scope.model = ctrls[0];
          scope.form = ctrls[1];
          scope.model.$validators = scope.model.$validators || {};
        }

        function extendValidators(field) {
          var validate = field.validate;
          
          if (validate && validate.length) {
            AdpValidationService.addValidators(field, scope.form);
          }
        }
      }
    }
  }
})();
