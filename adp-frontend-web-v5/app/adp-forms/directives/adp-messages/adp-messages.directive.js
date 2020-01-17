;(function () {
  'use strict';

  angular
      .module('app.adpForms')
      .directive('adpMessages', adpMessages);

  function adpMessages(AdpValidationMessages) {
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
          scope.fieldModel = scope.form[scope.field.fieldName];

          if (scope.field.validate && scope.field.validate.length) {
            scope.$watch(function () { return angular.toJson(scope.form); }, updateMessages);
          }
        }

        function updateMessages() {
          var formData = getViewValues(scope.form);
          scope.messages = AdpValidationMessages.updateAll(scope.field, formData);
        }

        function getViewValues(angularFormController) {
          var formData = {};

          _.each(angularFormController, function(field, key) {
            if (!_.hasIn(field, '$viewValue')) {
              return;
            }

            formData[key] = field.$viewValue;
          });

          return formData;
        }
      }
    }
  }
})();
