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

          injectValidators(validationParams, scope.form, validationParams.formData);
        }

        function injectValidators(validationParams, form, formData) {
          var validatorsToInject = {};
          var schemaField = validationParams.field;

          (schemaField.validate || []).forEach(function (validatorRule) {
            var validatorName = validatorRule.validator;
            if (!AdpValidationRules[validatorName]) {
              return;
            }

            validatorsToInject[validatorName] = function (viewValue) {
              if (_.isNil(viewValue) || viewValue === '') {
                return true;
              }

              var angularFormData = shallowTransformAngularFormToFormData(form, formData);
              return AdpValidationRules[validatorName](viewValue, schemaField, validatorRule, angularFormData);
            }
          });

          var formModel = _.get(form, validationParams.field.fieldName);
          return angular.extend(formModel.$validators, validatorsToInject);
        }

        function shallowTransformAngularFormToFormData(angularForm, formData) {
          var result = {};
          return _.each(formData, function (value, key) {
            if (_.isNil(angularForm[key])) {
              return;
            }
            result[key] = angularForm[key].$viewValue;
          });
        }
      }
    }
  }
})();
