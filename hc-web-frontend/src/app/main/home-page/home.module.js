(function ()
{
    'use strict';

    angular
        .module('app.homePage', [])
        .config(config);

    config.$inject = ['msNavigationServiceProvider', '$stateProvider'];
    /** @ngInject */
    function config(msNavigationServiceProvider, $stateProvider)
    {

        $stateProvider.state('app.homePage', {
            url  : '/home',
            views: {
                'content@app': {
                    templateUrl: 'app/main/home-page/home-page.html',
                    controller : 'HomePageController as vm'
                }
            },
            resolve: {
                
            }
        });

        // Navigation
        msNavigationServiceProvider.saveItem('homePage', {
            title    : 'Home',
            state    : 'app.homePage',
            weight   : 1,
            icon     : 'icon-home'
        });

    }
})();
