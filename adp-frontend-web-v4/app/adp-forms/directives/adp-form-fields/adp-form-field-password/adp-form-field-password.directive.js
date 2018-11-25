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
          var options = {
            data: scope.adpFormData[scope.adpField.keyName],
            actionType: 'passwordUpdate'
          };

          AdpModalService.createModal('adpPasswordModal', options)
            .result
            .then(updateField);
        }

        function updateField(result) {
          scope.adpFormData[scope.adpField.keyName] = result[scope.adpField.keyName];
          scope.adpFormData.passwordSet = true;
        }
      }
    }
  }
})();
