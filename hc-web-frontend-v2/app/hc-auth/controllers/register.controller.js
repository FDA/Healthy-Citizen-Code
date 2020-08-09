;(function () {
  "use strict";

  angular
    .module('app')
    .controller('RegisterController', RegisterController);

  /** @ngInject */
  function RegisterController(
    HcUserService,
    $state,
    HcNotificationService,
    HcSchemaService,
    INTERFACE
  ) {
    var vm = this;
    vm.fields = HcSchemaService.getRegisterSchema();
    vm.authParams = INTERFACE.loginPage.parameters;

    vm.submit = function (formData) {
      return HcUserService.create(formData)
        .then(function (response) {
          HcNotificationService.notifySuccess(response.data.message);
          return $state.go('auth.login');
        });
    };
  }
})();