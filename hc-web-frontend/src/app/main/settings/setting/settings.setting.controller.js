(function ()
{
    'use strict';

    angular
        .module('app.settings.single')
        .controller('SettingController', SettingController);

    /** @ngInject */
    function SettingController($stateParams, api, hcSchemaService, Setting, SettingsSchema)
    {

        // Data
        var vm = this;
        vm.setting = Setting;
        vm.settingSchema = SettingsSchema.data;

        vm.settingData = angular.copy(Setting);

        // hcSchemaService.iterate(vm.settingSchema, vm.settingData);
        // Methods
        vm.updateSetting = function () {
            console.log(api.settings.single.update);
            api.settings.single.update({id: vm.setting._id}, vm.settingData,
                function (response) {
                    console.log('Setting updated', response);
                }
            );
        };
    }
})();
