;(function () {
  "use strict";

  angular
    .module('app.adpAuth')
    .controller('RegisterController', RegisterController);

  /** @ngInject */
  function RegisterController(
    AdpUserService,
    $state,
    AdpNotificationService,
    AdpAuthSchemas
  ) {
    var vm = this;
    var INTERFACE = window.adpAppStore.appInterface();
    vm.args = AdpAuthSchemas.registrationArgs();

    vm.authParams = INTERFACE.loginPage.parameters;
    vm.showLogin = INTERFACE.app.auth.enableAuthentication;

    vm.formOptions = {
      disableFullscreen: true,
      localActionsStrategy: {
        submit: function (args) {
          return AdpUserService.create(args.row)
            .then(function (response) {
              AdpNotificationService.notifySuccess(response.data.message);
              return $state.go('auth.login');
            });
        },
      },
    };
  }
})();
