;(function () {
  "use strict";

  angular
    .module('app')
    .controller('LoginController', LoginController);

  /** @ngInject */
  function LoginController(
    HcSessionService,
    $state,
    HcSchemaService,
    INTERFACE,
    DEFAULT_STATE
  ) {
    var vm = this;
    vm.fields = HcSchemaService.getLoginSchema();
    vm.authParams = INTERFACE.loginPage.parameters;

    vm.submit = function (formData) {
      return HcSessionService.login(formData)
        .then(function () {
          return $state.go(DEFAULT_STATE.stateName);
        });
    };
  }
})();
