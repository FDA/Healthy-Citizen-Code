;(function () {
  "use strict";

  angular
    .module('app.adpAuth')
    .controller('LoginController', LoginController);

  /** @ngInject */
  function LoginController(
    AdpSessionService,
    AdpAuthSchemas
  ) {
    var INTERFACE = window.adpAppStore.appInterface();
    var vm = this;
    vm.schema = AdpAuthSchemas.login();
    vm.fields = vm.schema.fields;
    vm.authParams = INTERFACE.loginPage.parameters;

    vm.showSignUp = INTERFACE.app.auth.enableRegistration;

    vm.submit = function (formData) {
      return AdpSessionService.login(formData);
    };
  }
})();
