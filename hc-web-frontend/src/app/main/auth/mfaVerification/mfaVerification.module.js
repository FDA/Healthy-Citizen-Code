(function ()
{
    'use strict';

    angular
        .module('app.auth.verify', [
          'LocalStorageModule'
        ])
        .config(config);

    config.$inject = ['$stateProvider', '$translatePartialLoaderProvider', 'msNavigationServiceProvider'];
    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.mfaVerification', {
            url      : '/auth/mfaVerification',
            views    : {
                'main@': {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.mfaVerification': {
                    templateUrl: 'app/main/auth/mfaVerification/mfaVerification.html',
                    controller : 'MfaVerificationController as vm'
                }
            },
            bodyClass: 'login'
        });

    }

})();
