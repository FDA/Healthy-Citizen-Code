;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpValidate', adpValidate);

  function adpValidate(
    AdpValidationRules,
    AdpFormValidationRules,
    AdpValidationUtils
  ) {
    return {
      restrict: 'A',
      scope: false,
      require: ['ngModel', '^^form'],
      link: function (scope, element, attrs, ctrls) {
        var unbind = scope.$watch(attrs.adpValidate, function(validationParams) {
          init();
          extendValidators(validationParams);
          overloadBuiltInRequiredValidation(validationParams);

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

          injectValidators(validationParams.field, scope.form, validationParams.formData);
        }

        function injectValidators(schemaField, form, formData) {
          var validatorsToInject = {};

          (schemaField.validate || []).forEach(function (validatorRule) {
            var validatorName = validatorRule.validator;

            if (AdpFormValidationRules[validatorName]) {
              validatorsToInject[validatorName] = function (viewValue) {
                return AdpFormValidationRules[validatorName](viewValue, schemaField, formData, form)
              };
            } else if (AdpValidationRules[validatorName]) {
              validatorsToInject[validatorName] = function (viewValue) {
                if (_.isNil(viewValue) || viewValue === '') {
                  return true;
                }

                var angularFormData = getAngularShallowFormDataCopy(form, formData);
                return AdpValidationRules[validatorName](viewValue, schemaField, validatorRule, angularFormData);
              };
            }
          });

          var formModel = _.get(form, schemaField.fieldName);
          return angular.extend(formModel.$validators, validatorsToInject);
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

        function overloadBuiltInRequiredValidation(validationParams) {
          if (validationParams.field.type !== 'TreeSelector') {
            return;
          }

          var isRequired = AdpValidationUtils.getRequiredFn(validationParams.formParams);
          if (!isRequired()) {
            return;
          }

          var formField = scope.form[validationParams.field.fieldName];
          formField.$validators.required = function (modelValue) {
            var filtered = _.filter(modelValue, function (i) {
              return !_.isEmpty(i);
            });
            return !_.isEmpty(filtered);
          }
        }
      }
    }
  }
})();
