;(function () {
  'use strict';

  angular
      .module('app.adpForms')
      .directive('adpMessages', adpMessages);

  function adpMessages(AdpValidationMessages) {
    return {
      restrict: 'E',
      scope: {
        args: '=',
      },
      require: '^^form',
      templateUrl: 'app/adp-forms/directives/adp-messages/adp-messages.html',
      link: function (scope, el, attrs, form) {
        var unbind = scope.$watch('args', function () {
          init();
          unbind();
        });

        function init() {
          scope.field = scope.args.fieldSchema;
          if (_.isEmpty(scope.field.validate)) {
            return;
          }

          scope.fieldModel = form[scope.field.fieldName];
          scope.$watch('fieldModel.$viewValue', updateMessages);
        }

        function updateMessages(newVal, oldVal) {
          if (newVal === oldVal) {
            return;
          }

          scope.messages = AdpValidationMessages.updateAll(scope.field, getFormData());
        }

        function getFormData() {
          return _.transform(form.$getControls(), function (result, control) {
            result[control.$name] = control.$viewValue;
          }, {});
        }
      }
    }
  }
})();
