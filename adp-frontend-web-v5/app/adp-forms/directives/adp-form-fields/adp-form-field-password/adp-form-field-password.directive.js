(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldPassword', adpFormFieldPassword);

  function adpFormFieldPassword(AdpModalService) {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-password/adp-form-field-password.html',
      link: function (scope) {
        scope.onClick = function (e) {
          e.preventDefault();

          showModal();
        };

        function showModal() {
          AdpModalService.passwordUpdate(scope.adpField)
            .then(updateField);
        }

        function updateField(result) {
          scope.adpFormData[scope.adpField.fieldName] = result;
        }
      }
    }
  }
})();
