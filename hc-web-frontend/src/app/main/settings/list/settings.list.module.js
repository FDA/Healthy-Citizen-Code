(function ()
{
    'use strict';

    angular
        .module('app.settings.list', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, apiResolverProvider)
    {
        $stateProvider.state('app.settings_list', {
            url  : '/settings',
            views: {
                'content@app': {
                    templateUrl: 'app/main/settings/list/settings.list.html',
                    controller : 'SettingsListController as vm'
                }
            },
            resolve: {
                SettingsList: function (apiResolver)
                {
                    return apiResolver.resolve('settings.list@get');
                }
            }
        });
    }

})();
