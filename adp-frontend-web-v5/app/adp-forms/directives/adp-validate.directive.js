;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpValidate', adpValidate);

  function adpValidate(
    AdpValidationRules
  ) {
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

        function extendValidators(args) {
          var validator = getRules(args);
          if (_.isEmpty(validator)) {
            return;
          }

          injectValidators(args, scope.form);
        }

        function getRules(args) {
          return _.get(args, 'fieldSchema.validate', []);
        }

        function injectValidators(args, angularForm) {
          var formData = args.row;
          var form = angularForm;

          var rules = getRules(args);
          var resultValidators = {};

          rules.forEach(function (validatorRule) {
            var validatorName = validatorRule.validator;
            if (!AdpValidationRules[validatorName]) {
              return;
            }

            resultValidators[validatorName] = function (viewValue) {
              if (_.isNil(viewValue) || viewValue === '') {
                return true;
              }

              var validatorArgs = _.assign({}, args, {
                data: viewValue,
                validationRule: validatorRule,
                formData: getAngularShallowFormDataCopy(form, formData),
              });

              return AdpValidationRules[validatorName](validatorArgs);
            };
          });

          var angularFormControl = _.get(form, args.fieldSchema.fieldName);
          angular.extend(angularFormControl.$validators, resultValidators);
        }

        function getAngularShallowFormDataCopy(angularForm, formData) {
          var result = {};
          _.each(formData, function (value, key) {
            if (_.isNil(angularForm[key])) {
              return;
            }
            result[key] = angularForm[key].$viewValue;
          });

          return result;
        }
      }
    }
  }
})();
