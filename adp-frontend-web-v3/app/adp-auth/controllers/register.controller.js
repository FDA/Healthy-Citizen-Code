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
    AdpSchemaService,
    INTERFACE
  ) {
    var vm = this;
    vm.fields = AdpSchemaService.getRegisterSchema();
    vm.authParams = INTERFACE.loginPage.parameters;

    vm.submit = function (formData) {
      return AdpUserService.create(formData)
        .then(function (response) {
          AdpNotificationService.notifySuccess(response.data.message);
          return $state.go('auth.login');
        });
    };
  }
})();