(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldContainer', adpFormFieldContainer);

  function adpFormFieldContainer() {
    return {
      restrict: 'E',
      scope: {
        adpField: '<',
        adpFormData: '<',
        adpIsError: '<',
        adpIsSuccess: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-field-container/adp-form-field-container.html',
      require: '^^form',
      transclude: true,
      link: function (scope, el, attrs, formCtrl) {
        var unbind = scope.$watch("adpField", function () {
          init();
          unbind();
        });

        function init() {
          scope.field = scope.adpField;
          scope.form = formCtrl;

          scope.successCondition = successCondition;
          scope.errorCondition = errorCondition;
        }

        function successCondition() {
          var model = scope.form[scope.field.fieldName];
          if (_.isNil(model)) {
            return false;
          }

          var successCondition;
          if (_.isUndefined(scope.adpIsSuccess)) {
            successCondition = model.$dirty && model.$valid;

            if (!scope.field.required) {
              return successCondition && !!model.$viewValue;
            }
          } else {
            return scope.adpIsSuccess();
          }
        }

        function errorCondition() {
          var model = scope.form[scope.field.fieldName];
          if (_.isNil(model)) {
            return false;
          }

          if (_.isUndefined(scope.adpIsError)) {
            return (scope.form.$submitted || model.$dirty) && model.$invalid;
          } else {
            return scope.adpIsError();
          }
        }
      }
    }
  }
})();
