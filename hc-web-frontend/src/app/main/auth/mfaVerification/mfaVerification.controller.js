(function ()
{
    'use strict';

    angular
        .module('app.auth.verify')
        .controller('MfaVerificationController', MfaVerificationController);

    /** @ngInject */
    function MfaVerificationController(config, localStorageService, api, $http, hcSessionService, hcFlashService, $state)
    {
        // Data
        var vm = this;
        vm.errors = [];


        /////////////////////////////////
        
        // Methods
        vm.verify = function () {
            api.auth.twoFactorAuthVerify.save({}, {
                key: pad(vm.form.code, 6)
            }, function (response) {
                hcSessionService.setToken(response.token);
                hcSessionService.setDefaultHeaders();
                $state.go('app.homePage');
            }, function (error, status) {
                hcFlashService.error(error.data.message);
            });
        };


        function pad(num, size) {
            var s = num+"";
            while (s.length < size) s = "0" + s;
            return s;
        }

    }
})();
