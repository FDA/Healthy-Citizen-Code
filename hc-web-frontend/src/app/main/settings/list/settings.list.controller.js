(function ()
{
    'use strict';

    angular
        .module('app.settings.list')
        .controller('SettingsListController', SettingsListController);

    /** @ngInject */
    function SettingsListController(api, SettingsList)
    {
        // Data
        var vm = this;

        vm.settingsList = SettingsList;

        //////////////////////////////
        // Methods
        function updateAuthSettings () {
            api.auth.settings.save({}, vm.auth,
                function (response) {
                    console.log(response);
                },
                function (error, status) {

                });
        };
    }
})();
