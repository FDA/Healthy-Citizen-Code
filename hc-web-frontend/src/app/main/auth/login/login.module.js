(function ()
{
    'use strict';

    angular
        .module('app.auth.login', [
          'LocalStorageModule',
          'vcRecaptcha'
        ])
        .config(config);

    config.$inject = ['$stateProvider', '$translatePartialLoaderProvider', 'msNavigationServiceProvider'];
    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.login', {
            url      : '/auth/login',
            views    : {
                'main@': {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.login': {
                    templateUrl: 'app/main/auth/login/login.html',
                    controller : 'LoginController as vm'
                }
            },
            bodyClass: 'login'
        });

    }

})();
