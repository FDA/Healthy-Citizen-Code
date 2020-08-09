(function() {
    'use strict';

    angular
        .module('app.auth.register', [
            'LocalStorageModule',
            'vcRecaptcha'
        ])
        .config(config);

    config.$inject = ['$stateProvider', 'msNavigationServiceProvider'];
    /** @ngInject */
    function config($stateProvider, msNavigationServiceProvider) {
        // State
        $stateProvider.state('app.register', {
            url: '/auth/register',
            views: {
                'main@': {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller: 'MainController as vm'
                },
                'content@app.register': {
                    templateUrl: 'app/main/auth/register/register.html',
                    controller: 'RegisterController as vm'
                }
            },
            bodyClass: 'register',
            resolve: {
                // UserSchema: function (apiResolver)
                // {
                //     return apiResolver.resolve('schema.user@get');
                // }
            }
        });

    }

})();
