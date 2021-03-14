(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('passwordControl', PasswordControl);

  function PasswordControl(
    AdpModalService,
    ControlSetterGetter
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '=',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/password-control/password-control.html',
      link: function (scope) {
        var getterSetterFn = ControlSetterGetter(scope.args);
        scope.onClick = function (e) {
          e.preventDefault();
          showModal();
        };

        function showModal() {
          AdpModalService.passwordUpdate(scope.args)
            .then(getterSetterFn);
        }
      }
    }
  }
})();
