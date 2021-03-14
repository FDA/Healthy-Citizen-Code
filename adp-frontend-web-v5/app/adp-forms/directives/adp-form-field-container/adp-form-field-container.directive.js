(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldContainer', adpFormFieldContainer);

  function adpFormFieldContainer(AdpAttrs) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        enabled: '<?',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-field-container/adp-form-field-container.html',
      require: '^^form',
      transclude: true,
      link: function (scope, el, attrs, formCtrl) {
        (function init() {
          AdpAttrs(el.find('.input-container')[0], scope.args);
          setClassCondition();
        })();

        function setClassCondition() {
          if (!conditionsEnabled()) {
            scope.successCondition = false;
            scope.errorCondition = false;
            return;
          }

          scope.form = formCtrl;
          scope.successCondition = successCondition;
          scope.errorCondition = errorCondition;
        }

        function conditionsEnabled() {
          if (_.isNil(scope.enabled)) {
            return true;
          }

          return scope.enabled;
        }

        function successCondition() {
          var model = scope.form[scope.args.fieldSchema.fieldName];
          if (_.isNil(model)) {
            return false;
          }

          if (scope.args.fieldSchema.required) {
            return false;
          }

          return (model.$dirty && model.$valid) && !!model.$viewValue;
        }

        function errorCondition() {
          var model = scope.form[scope.args.fieldSchema.fieldName];
          if (_.isNil(model)) {
            return false;
          }

          return (scope.form.$submitted || model.$dirty) && model.$invalid;
        }
      }
    }
  }
})();
