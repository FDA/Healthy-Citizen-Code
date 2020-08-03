;(function () {
  "use strict";

  angular
    .module('app.adpAuth')
    .controller('LoginController', LoginController);

  /** @ngInject */
  function LoginController(
    AdpAuthSchemas,
    AdpSessionService
  ) {
    var INTERFACE = window.adpAppStore.appInterface();
    var vm = this;
    vm.args = AdpAuthSchemas.loginArgs();

    vm.authParams = INTERFACE.loginPage.parameters;
    vm.showSignUp = INTERFACE.app.auth.enableRegistration;
    vm.showReset = INTERFACE.app.auth.enableUserPasswordReset;


    vm.formOptions = {
      disableFullscreen: true,
      localActionsStrategy: {
        submit: function (args) {
          return AdpSessionService.login(args.row);
        },
      }
    };
  }
})();
