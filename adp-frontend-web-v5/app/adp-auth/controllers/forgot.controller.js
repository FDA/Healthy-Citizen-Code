;(function () {
  "use strict";

  angular
    .module('app.adpAuth')
    .controller('ForgotController', ForgotController)
    .controller('ResetController', ResetController);

  /** @ngInject */
  function ForgotController(
    AdpSessionService,
    AdpAuthSchemas
  ) {
    var INTERFACE = window.adpAppStore.appInterface();
    var vm = this;
    vm.schema = AdpAuthSchemas.forgot();
    vm.fields = vm.schema.fields;
    vm.authParams = INTERFACE.loginPage.parameters;

    vm.submit = function (formData) {
      return AdpSessionService.forgot(formData);
    };
  }

  /** @ngInject */
  function ResetController(
    AdpSessionService,
    AdpAuthSchemas,
    AdpNotificationService,
    $state,
    ResponseError
) {
    var INTERFACE = window.adpAppStore.appInterface();
    var vm = this;
    vm.schema = AdpAuthSchemas.reset();
    vm.fields = vm.schema.fields;
    vm.isReset = false;
    vm.authParams = INTERFACE.loginPage.parameters;
    vm.login = $state.params.login;

    vm.submit = function (formData) {
      return AdpSessionService
        .reset(formData)
        .then(function (res) {
          if (!res.data.success) {
            throw new ResponseError(res.data.message);
          }

          vm.isReset = true;
          AdpNotificationService.notifySuccess("Password has been reset, please sign in using your new password", true);
          return res;
        });
    };

    vm.goLogin = function(){
      $state.go('auth.login');
    }
  }
})();
