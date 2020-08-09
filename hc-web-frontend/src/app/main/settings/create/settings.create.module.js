(function ()
{
    'use strict';

    angular
        .module('app.settings.create', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, apiResolverProvider)
    {
        $stateProvider.state('app.settings_create', {
            url  : '/settings/create',
            views: {
                'content@app': {
                    templateUrl: 'app/main/settings/create/settings.create.html',
                    controller : 'SettingsCreateController as vm'
                }
            },
            resolve: {
                SettingsSchema: function (apiResolver)
                {
                    return apiResolver.resolve('schema.settings@get');
                }

            }
        });
    }

})();
