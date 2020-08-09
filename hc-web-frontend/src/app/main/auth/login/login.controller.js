(function ()
{
    'use strict';

    angular
        .module('app.auth.login')
        .controller('LoginController', LoginController);

    /** @ngInject */
    function LoginController($http, config, CONSTANTS, localStorageService, $rootScope, hcErrorsHandler, hcSessionService, $state)
    {
        // Data
        var vm = this;

        vm.key = config.reCaptchaKey;
        vm.captchaDisabled = CONSTANTS.captchaDisabled;
        vm.errors = [];
        /////////////////////

        // Methods
        vm.login = function () {

            $http.post(CONSTANTS.apiUrl + 'login', vm.form).then(
                function (response) {
                    // console.log(response.data);
                    hcSessionService.onLogin(response.data);
                    // TODO: temporary hardcoded
                    var ids = {
                        'phis': response.data.data.user.phiId,
                        'piis': response.data.data.user.piiId
                    };

                    $rootScope.ids = window.ids = ids;
                    
                    // // TODO: update this variable
                    // var twoFactorAuth = response.user.twoFactorAuth;

                    // hcSessionService.setToken(response.token);
                    // hcSessionService.setDefaultHeaders();

                    // // Two factor auth is disabled
                    // if (!twoFactorAuth) {
                        $state.go('app.homePage');
                    // }
                    // // Two factor auth is enabled
                    // else {
                    //     $state.go('app.mfaVerification');
                    // }

                },
                function (error, status) {
                    hcErrorsHandler.handle(error);
                }
            );

            // return vm.form;
        };
    }
})();
