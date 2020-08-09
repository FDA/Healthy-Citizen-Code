(function ()
{
    'use strict';

    angular
        .module('app.settings.single', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, apiResolverProvider)
    {
        $stateProvider.state('app.setting', {
            url  : '/settings/:id',
            views: {
                'content@app': {
                    templateUrl: 'app/main/settings/setting/settings.setting.html',
                    controller : 'SettingController as vm'
                }
            },
            resolve: {
                Setting: function ($stateParams, apiResolver) {
                    return apiResolver.resolve('settings.single@get', {id: $stateParams.id});
                },
                SettingsSchema: function (apiResolver)
                {
                    return apiResolver.resolve('schema.settings@get');
                }
            }
        });
    }

})();
