(function () {
  'use strict';

  angular
    .module('app.hcForms')
    .directive('hcFormFieldContainer', hcFormFieldContainer);

  function hcFormFieldContainer() {
    return {
      restrict: 'E',
      scope: {
        hcField: '=',
        hcIsError: '=',
        hcIsSuccess: '='
      },
      templateUrl: 'app/hc-forms/directives/hc-form-field-container/hc-form-field-container.html',
      require: '^^form',
      transclude: true,
      link: function (scope, el, attrs, formCtrl) {
        scope.field = scope.hcField;
        scope.form = formCtrl;
        scope.model = scope.form[scope.field.keyName];

        scope.$watch(function () {
          return angular.toJson(scope.model);
        }, function (newVal, oldVal) {
          if (newVal === oldVal) return;

          evalErrorState();
          evalSuccessState();
        });

        function evalErrorState() {
          if (_.isUndefined(scope.hcIsError)) {
            scope.errorCondition = scope.model.$dirty && scope.model.$invalid;
          } else {
            scope.errorCondition = scope.hcIsError;
          }
        }

        function evalSuccessState() {
          if (_.isUndefined(scope.hcIsSuccess)) {
            scope.successCondition =
              (!scope.field.required && scope.model.$dirty && scope.model.$viewValue.length > 0 && scope.model.$valid) ||
              (scope.model.$dirty && scope.field.required && scope.model.$valid)
          } else {
            scope.successCondition = scope.hcIsSuccess;
          }
        }
      }
    }
  }
})();
