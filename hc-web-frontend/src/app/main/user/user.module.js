(function ()
{
    'use strict';

    angular
        .module('app.user', [])
        .config(config);

    /** @ngInject */
    function config(msNavigationServiceProvider, $stateProvider, apiResolverProvider)
    {
        $stateProvider.state('app.user', {
            url: '/user',
            params: {
                tab: null
            },
            views: {
                'content@app': {
                    templateUrl: 'app/main/user/user.html',
                    controller: 'UserController as vm'
                }
            },
            resolve: {
                User: function(apiResolver) {
                    return apiResolver.resolve('user@get');
                },
                UserSchema: function(apiResolver) {
                    return apiResolver.resolve('schema.user@get');
                },
                Hospitals: function (apiResolver)
                {
                    // return 'asdfasdfads';
                    return apiResolver.resolve('hospitals@get')
                }
            }
        });

        // Navigation
        msNavigationServiceProvider.saveItem('userGroup', {
            title : 'user',
            group : true,
            weight   : 2
        });

        msNavigationServiceProvider.saveItem('userGroup.user', {
            title    : 'My Profile',
            state    : 'app.user',
            weight   : 3,
            icon     : 'icon-briefcase-checked'
        });
    }
})();
