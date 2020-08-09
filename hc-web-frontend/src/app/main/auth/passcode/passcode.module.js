(function() {
    'use strict';

    angular
        .module('app.auth.passcode', [])
        .config(config);

    config.$inject = ['$stateProvider', 'msNavigationServiceProvider'];
    /** @ngInject */
    function config($stateProvider, msNavigationServiceProvider) {
        // State
        $stateProvider.state('app.passcode', {
            url: '/auth/passcode',
            views: {
                'main@': {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller: 'MainController as vm'
                },
                'content@app.passcode': {
                    templateUrl: 'app/main/auth/passcode/passcode.html',
                    controller: 'PasscodeController as vm'
                }
            },
            bodyClass: 'passcode',
            params: {
                userData: null
            }
        });

    }

})();
