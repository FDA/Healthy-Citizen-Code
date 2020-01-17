;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpValidate', adpValidate);

  function adpValidate(AdpValidationRules) {
    return {
      restrict: 'A',
      scope: false,
      require: ['ngModel', '^^form'],
      link: function (scope, element, attrs, ctrls) {
        var unbind = scope.$watch(attrs.adpValidate, function(validationParams) {
          init();
          extendValidators(validationParams);
          unbind();
        });

        function init() {
          scope.model = ctrls[0];
          scope.form = ctrls[1];
          scope.model.$validators = scope.model.$validators || {};
        }

        function extendValidators(validationParams) {
          var validator = _.get(validationParams, 'field.validate', []);
          if (_.isEmpty(validator)) {
            return;
          }
          injectValidators(validationParams, scope.form);
        }

        function injectValidators(validationParams, form) {
          var model = _.get(form, validationParams.field.fieldName);
          return angular.extend(model.$validators, AdpValidationRules(validationParams, form));
        }
      }
    }
  }
})();
