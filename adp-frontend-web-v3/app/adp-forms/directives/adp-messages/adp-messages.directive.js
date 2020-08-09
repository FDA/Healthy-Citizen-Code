;(function () {
  'use strict';

  angular
      .module('app.adpForms')
      .directive('adpMessages', adpMessages);

  function adpMessages(AdpValidationService) {
    return {
      restrict: 'E',
      scope: {
        adpField: '='
      },
      require: '^^form',
      templateUrl: 'app/adp-forms/directives/adp-messages/adp-messages.html',
      link: function (scope, element, attrs, formCtrl) {
        var unbind = scope.$watch("adpField", function () {
          init();
          unbind();
        });

        function init() {
          scope.form = formCtrl;
          scope.field = scope.adpField;
          scope.fieldModel = scope.form[scope.field.keyName];

          if (scope.field.validate && scope.field.validate.length) {
            scope.$watch(function () { return angular.toJson(scope.form); }, updateMessages);
          }
        }

        function updateMessages() {
          scope.messages = AdpValidationService.updateMessages(scope.field, scope.form);
        }
      }
    }
  }
})();
