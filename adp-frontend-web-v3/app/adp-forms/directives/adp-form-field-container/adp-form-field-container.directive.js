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
          scope.model = scope.form[scope.field.keyName];

          scope.$watch(function () { return angular.toJson(scope.model); }, watchHandler);
        }

        function watchHandler(newVal, oldVal) {
          if (newVal === oldVal) return;

          evalErrorState();
          evalSuccessState();
        }

        function evalErrorState() {
          if (_.isUndefined(scope.adpIsError)) {
            scope.errorCondition = scope.model.$dirty && scope.model.$invalid;
          } else {
            scope.errorCondition = scope.adpIsError;
          }
        }

        function evalSuccessState() {
          if (_.isUndefined(scope.adpIsSuccess)) {
            scope.successCondition =
              (!scope.field.required && scope.model.$dirty && scope.model.$viewValue.length > 0 && scope.model.$valid) ||
              (scope.model.$dirty && scope.field.required && scope.model.$valid)
          } else {
            scope.successCondition = scope.adpIsSuccess;
          }
        }
      }
    }
  }
})();
