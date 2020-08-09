(function ()
{
    'use strict';

    angular
        .module('app.auth.register')
        .controller('RegisterController', RegisterController);

    /** @ngInject */
    function RegisterController($http, config, CONSTANTS, $state, localStorageService, api, hcFlashService, hcSchemaService, hcSessionService, hcErrorsHandler)
    {
        // Data
        var vm = this;
        // vm.UserSchema = UserSchema.data;

        vm.captchaDisabled = CONSTANTS.captchaDisabled;
        vm.key = config.reCaptchaKey;

        vm.user = {};

        vm.errors = {};


        // Methods

        // // Modify schema
        // var fieldsToRemove = ['citizenPiiId', 'additionalProvidersData', 'demographic', 'providerData', 'settings'];

        // _.forEach(fieldsToRemove, function (field) {
        //     _.unset(vm.UserSchema, field);
        // });

        // if (vm.UserSchema.password) {
        //     vm.UserSchema.password.colspan = 2;
        // }
        // vm.UserSchema.repeatPassword = {
        //     type: "String",
        //     fieldType: "password",
        //     required: true,
        //     colspan: 2
        // };


        vm.createUser = function () {
            if (vm.newUser.password == vm.repeatPassword) {
                // remove repeat password from request
                // _.unset(vm.user, 'repeatPassword');

                $http.post(CONSTANTS.apiUrl + 'signup', vm.newUser).then(
                    // success
                    function(response) {
                        $state.go('app.login').then(function () {
                            hcFlashService.success('Successful sign up');
                        });
                    },

                    // error
                    function (error, status) {
                        hcErrorsHandler.handle(error);
                    }
                );

                return vm.newUser;
            } else {
                hcErrorsHandler.handle({message: "Passwords should be equal"});

                return vm.errors;
            }
        };

    }
})();
