(function ()
{
    'use strict';

    angular
        .module('app.auth.passcode')
        .controller('PasscodeController', PasscodeController);


    PasscodeController.$inject = ['config', '$state', '$stateParams', 'api', 'hcSessionService'];
    /** @ngInject */
    function PasscodeController(config, $state, $stateParams, api, hcSessionService)
    {
        // Data
        var vm = this;
        vm.errors = [];


        vm.userData = $stateParams.userData;
        if (!vm.userData) {
            $state.go('app.login');
        }

        vm.verifyPasscode = function () {
            // api.get

            api.auth.verifyPasscode.save({}, {
                "passcode": vm.passcode
            }, function (response) {
                hcSessionService.onLogin(vm.userData);
                hcSessionService.setToken(response.token);
                hcSessionService.setDefaultHeaders();
                $state.go('app.homePage');
            }, function (error, status) {
                vm.errors = [];
                vm.errors.push(error.data);
                // console.log(error.data.message, vm.errors);
                vm.passcode = null;
            });
            //
        }
    }
})();
