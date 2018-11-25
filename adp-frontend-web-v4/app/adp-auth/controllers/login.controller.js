;(function () {
  "use strict";

  angular
    .module('app.adpAuth')
    .controller('LoginController', LoginController);

  /** @ngInject */
  function LoginController(
    AdpSessionService,
    AdpSchemaService
  ) {
    var INTERFACE = window.adpAppStore.appInterface();
    var vm = this;
    vm.fields = AdpSchemaService.getLoginSchema();
    vm.authParams = INTERFACE.loginPage.parameters;

    vm.submit = function (formData) {
      return AdpSessionService.login(formData);
    };
  }
})();
