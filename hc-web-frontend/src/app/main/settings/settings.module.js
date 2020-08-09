(function ()
{
    'use strict';

    angular
        .module('app.settings', [
          'app.settings.create',
          'app.settings.list',
          'app.settings.single'
        ])
        .config(config);

    /** @ngInject */
    function config(msNavigationServiceProvider)
    {

        // Navigation
        msNavigationServiceProvider.saveItem('settings', {
            title : 'SETTINGS',
            group : true,
            weight   : 2
        });

        msNavigationServiceProvider.saveItem('settings.settingsList', {
          title    : 'Settings',
          state    : 'app.settings_list',
          weight   : 1,
          icon     : 'icon-checkbox-multiple-blank-outline'
        });

        msNavigationServiceProvider.saveItem('settings.create', {
            title    : 'Create Settings',
            state    : 'app.settings_create',
            weight   : 2,
            icon     : 'icon-checkbox-marked-outline'
        });
    }
})();
