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
    AdpSchemaService
  ) {
    var INTERFACE = window.adpAppStore.appInterface();
    var vm = this;
    vm.schema = AdpSchemaService.getRegisterSchema();
    vm.fields = vm.schema.fields;
    vm.authParams = INTERFACE.loginPage.parameters;

    vm.showLogin = INTERFACE.app.auth.enableAuthentication;

    vm.submit = function (formData) {
      return AdpUserService.create(formData)
        .then(function (response) {
          AdpNotificationService.notifySuccess(response.data.message);
          return $state.go('auth.login');
        });
    };
  }
})();