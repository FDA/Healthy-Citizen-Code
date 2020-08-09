(function ()
{
    'use strict';

    angular
        .module('app.core')
        .factory('hcSessionService', hcSessionService);

    hcSessionService.$inject = ['$q', '$http', '$rootScope', '$state', 'CONSTANTS', 'localStorageService', 'hcFlashService']
    /** @ngInject */
    function hcSessionService($q, $http, $rootScope, $state, CONSTANTS, localStorageService, hcFlashService)
    {
        var service = {
            setUser            : setUser,
            getUser            : getUser,
            setToken           : setToken,
            getToken           : getToken,
            clearUserData      : clearUserData,
            setDefaultHeaders  : setDefaultHeaders,
            onLogin            : onLogin,
            logout             : logout,
            handleAnauthorized : handleAnauthorized,
            getUserData        : getUserData
        };


        return service;

        // Methods
        function setUser (user) {
            localStorageService.set('user', user);
        };

        function getUser () {
            return localStorageService.get('user');
        };

        function setToken (token) {
            localStorageService.set('token', token)
        };

        function getToken () {
            return localStorageService.get('token');
        };

        function clearUserData () {
            localStorageService.remove('user');
            localStorageService.remove('token');
            $http.defaults.headers.common['Authorization'] = '';
            $.ajaxSetup({
                headers: {
                    'Authorization': ''
                }
            });
        };

        function setDefaultHeaders () {
            var token = this.getToken();
            if (token) {
                $http.defaults.headers.common['Authorization'] = 'JWT ' + token;
                $.ajaxSetup({
                    headers: {
                        'Authorization': 'JWT ' + token
                    }
                });
            }
        };

        function onLogin (response) {
            this.setUser(response.data.user);
            this.setToken(response.data.token);
            this.setDefaultHeaders();
        };

        function logout (errorMessage) {
            this.clearUserData();
            $state.go('app.login').then(function () {
                hcFlashService.error(errorMessage);
            });
        };

        function handleAnauthorized (response) {
            var errorMessage = response.data.message || "Plese login again";

            this.logout(errorMessage);
        };

        function getUserData () {
            var deffered = $q.defer();

            // $http.get(CONSTANTS.apiUrl + 'users')
            //     .then(function (response) {
            //         $rootScope.user = response.data.data[0];

                    /**
                     * Remove this right after autentification will be ready
                     * From here ...
                     */

                    // var keys = _.keys(window.schemas);
                    // _.forEach(keys, function (item) {
                    //     $http.get(CONSTANTS.apiUrl + item)
                    //         .then(function (response) {
                    //             $rootScope.phiData = response.data.data[0];
                    //             $rootScope.user.phiId = $rootScope.phiData._id;

                    //             deffered.resolve(true);
                    //         });
                    // });

                    // $http.get(CONSTANTS.apiUrl + 'phis')
                    //     .then(function (response) {
                    //         $rootScope.phiData = response.data.data[0];
                    //         $rootScope.user.phiId = $rootScope.phiData._id;

                    //         deffered.resolve(true);
                    //     });

                    // $http.get(CONSTANTS.apiUrl + 'piis')
                    //     .then(function (response) {
                    //         $rootScope.piiData = response.data.data[0];
                    //         $rootScope.user.piiId = $rootScope.piiData._id;
                    //     });

                    /**
                     * to Here
                     */
                // });

            // return deffered.promise;
        };

    };
})();
