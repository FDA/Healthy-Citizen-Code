;(function () {
  'use strict';

  angular
      .module('app.hcForms')
      .directive('hcMessages', hcMessages);

  function hcMessages(HcValidationService) {
    return {
      restrict: 'E',
      scope: {
        hcField: '='
      },
      require: '^^form',
      templateUrl: 'app/hc-forms/directives/hc-messages/hc-messages.html',
      link: function (scope, element, attrs, formCtrl) {
        scope.form = formCtrl;
        scope.field = scope.hcField;
        scope.fieldModel = scope.form[scope.field.keyName];

        if (scope.field.validate && scope.field.validate.length) {
          scope.$watch(function () {
            return angular.toJson(scope.form);
          }, function () {
            scope.messages = HcValidationService.updateMessages(scope.field, scope.form);
          });
        }
      }
    }
  }
})();
