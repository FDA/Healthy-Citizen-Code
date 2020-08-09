;(function () {
  "use strict";

  angular
    .module('app.adpAuth')
    .controller('LoginController', LoginController);

  /** @ngInject */
  function LoginController(
    AdpSessionService,
    $state,
    AdpSchemaService,
    INTERFACE,
    DEFAULT_STATE
  ) {
    var vm = this;
    vm.fields = AdpSchemaService.getLoginSchema();
    vm.authParams = INTERFACE.loginPage.parameters;

    vm.submit = function (formData) {
      return AdpSessionService.login(formData)
        .then(function () {
          return $state.go(DEFAULT_STATE.stateName);
        });
    };
  }
})();
