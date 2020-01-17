(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldContainer', adpFormFieldContainer);

  function adpFormFieldContainer() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpIsError: '=',
        adpIsSuccess: '='
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

          scope.$watch(function () { return angular.toJson(scope.form); }, watchHandler);
        }

        function watchHandler() {
          scope.model = scope.form[scope.field.fieldName];

          if (_.isUndefined(scope.model)) {
            return;
          }

          evalErrorState();
          evalSuccessState();
        }

        function evalErrorState() {
          if (_.isUndefined(scope.adpIsError)) {
            scope.errorCondition = (scope.form.$submitted || scope.model.$dirty) && scope.model.$invalid;
          } else {
            scope.errorCondition = scope.adpIsError();
          }
        }

        function evalSuccessState() {
          if (_.isUndefined(scope.adpIsSuccess)) {
            scope.successCondition = scope.model.$dirty && scope.model.$valid;

            if (!scope.field.required) {
              scope.successCondition = scope.successCondition && !!scope.model.$viewValue;
            }
          } else {
            scope.successCondition = scope.adpIsSuccess();
          }
        }
      }
    }
  }
})();
