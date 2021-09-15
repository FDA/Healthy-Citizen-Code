;(function () {
  "use strict";

  angular
    .module('app.adpAuth')
    .controller('ForgotController', ForgotController)
    .controller('ResetController', ResetController);

  /** @ngInject */
  function ForgotController(
    AdpAuthSchemas,
    AdpSessionService
  ) {
    var vm = this;
    var INTERFACE = window.adpAppStore.appInterface();
    vm.authParams = INTERFACE.loginPage.parameters;

    vm.args = AdpAuthSchemas.forgotPasswordArgs();
    vm.formOptions = {
      disableFullscreen: true,
      localActionsStrategy: {
        submit: function (args) {
          return AdpSessionService.forgot(args.row);
        },
      },
    };
  }

  /** @ngInject */
  function ResetController(
    AdpSessionService,
    AdpAuthSchemas,
    AdpNotificationService,
    ResponseError,
    $state
) {
    var vm = this;
    var INTERFACE = window.adpAppStore.appInterface();
    vm.authParams = INTERFACE.loginPage.parameters;
    vm.args = AdpAuthSchemas.resetPasswordArgs();
    vm.isReset = false;

    vm.formOptions = {
      disableFullscreen: true,
      localActionsStrategy: {
        submit: function(args) {
          return AdpSessionService
            .reset(args.row)
            .then(function (res) {
              if (!res.data.success) {
                throw new ResponseError(res.data.message);
              }

              vm.isReset = true;
              AdpNotificationService.notifySuccess("Password has been reset, please sign in using your new password");
              return res;
            });
        }
      },
    };

    vm.goLogin = function(){
      $state.go('auth.login');
    }
  }
})();
