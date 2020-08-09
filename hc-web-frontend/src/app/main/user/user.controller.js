(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('UserController', UserController);

    /* @ngInject */
    function UserController($http, $state, $stateParams, api, hcSessionService, hcFlashService, hcUtilsService, CONSTANTS, User, UserSchema, Hospitals) {
        // Data
        var vm = this;

        vm.userData = User;
        vm.userDataSchema = UserSchema.data;
        vm.formName = UserSchema.name;

        vm.hospitals = Hospitals;
        vm.hospitalsKeys = _.keys(Hospitals.items[0]);
        
        _.pull(vm.hospitalsKeys, '_id', '__v');

        vm.displayUserData;

        vm.activeTab = $stateParams.tab;
        


        //////////////////////////////////////
        
        // Methods
        function applyUserDisplayData (data) {
            vm.displayUserData = angular.copy(data);
            var fieldsToRemove = ['_id', '__v', 'password', 'repeatPassword'];
            hcUtilsService.removeFields(vm.displayUserData, fieldsToRemove);
        };
        applyUserDisplayData(vm.userData);

        vm.updateUser = function () {
            api.user.update({}, vm.userData,
                function (response) {
                    vm.userData = response.user;
                    applyUserDisplayData(response.user);

                    $state.go($state.current, {tab: "Info"}, {reload: true}).then(
                        function () {
                            hcFlashService.success('User data updated');
                        }
                    );
                }, function (error, status) {
                    hcFlashService.success(error.message);
                });

        };
        
        vm.syncHospital = function (id) {
            // var hospitalsIds
            api.syncUser.save({}, {
                hospitals: id,
                patientId: vm.patientId
            }, function (response) {
                hcFlashService.success('Phi Data Synced');

            }, function (errors) {
                console.log(errors);
            });
        };

        vm.toggleTwoFactorAuth = function (toggle) {
            // Enable
            if (!!toggle) {
                vm.showValidators = true;

                $http.get(CONSTANTS.apiUrl + 'auth/qrcode')
                    .then(function (response) {
                       vm.qrcode = response.data; 
                    });
            } 
            // Disable
            else { 
                vm.showValidators = false;

                api.auth.settings.save({}, {
                    twoFactorAuth: false
                }, function (response) {
                    vm.settings.twoFactorAuth = false;
                    hcFlashService.success('Two Factor Auth successfully disabled');
                }, function (error, status) {
                    hcFlashService.error('Something goes wrong, try again latter');
                });    
            }
        };

        vm.verify = function () {
            api.auth.twoFactorAuthVerify.save({}, {
                key: vm.verificationCode
            }, function (response) {
                console.log(response, response.token);
                if (response.verified) {

                    vm.settings.twoFactorAuth = true;
                    hcFlashService.success('Two Factor Auth successfully enabled');

                    hcSessionService.setToken(response.token);
                    hcSessionService.setDefaultHeaders();
                    
                }
            }, function (error, status) {
                hcFlashService.error('Validation code is invalid');
            });
        };


        api.auth.settings.get({}, function(response) {
            vm.settings = response;
        });
    }
})();
