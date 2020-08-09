(function ()
{
    'use strict';

    angular
        .module('app.settings.create')
        .controller('SettingsCreateController', SettingsCreateController);

    /** @ngInject */
    function SettingsCreateController($state, api, SettingsSchema, hcSchemaService)
    {
        // Data
        var vm = this;

        vm.settingsSchema = SettingsSchema.data;

        vm.setting = {};

        hcSchemaService.iterate(vm.settingsSchema, vm.setting);

        // Methods
        vm.createSettings = function () {


          api.settings.list.save({}, vm.setting,
              // success
              function(response) {
                  $state.go('app.setting', {'id': response._id});
              },

              // error
              function (error, status) {

              }
          );
        };

    }
})();
