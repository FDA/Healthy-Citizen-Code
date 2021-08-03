;(function () {
  'use strict';

  angular
    .module('app.adpAuth')
    .controller('LoginOtpController', LoginOtpController);

  /** @ngInject */
  function LoginOtpController(
    $state,
    AdpAuthSchemas,
    AdpSessionService
  ) {
    var INTERFACE = window.adpAppStore.appInterface();
    var vm = this;
    var login = _.get($state, 'params.credentials.login');
    var password = _.get($state, 'params.credentials.password');

    vm.authParams = INTERFACE.loginPage.parameters;
    vm.showSignUp = INTERFACE.app.auth.enableRegistration;
    vm.showReset = INTERFACE.app.auth.enableUserPasswordReset;

    if (!login || !password) {
      $state.go('auth.login', $state.params);
    }

    vm.args = AdpAuthSchemas.loginOtpArgs();

    vm.formOptions = {
      disableFullscreen: true,
      localActionsStrategy: {
        submit: function (args) {
          var formDataWithCredentials = _.assign({}, args.row, {login: login, password: password});

          return AdpSessionService.login(formDataWithCredentials);
        },
      }
    };
  }
})();
