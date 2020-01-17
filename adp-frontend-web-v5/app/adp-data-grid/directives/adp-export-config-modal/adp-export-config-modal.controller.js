;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .controller('AdpExportConfigModalController', AdpExportConfigModalController);

  /** @ngInject */
  function AdpExportConfigModalController() {
    var vm = this;

    vm.$onInit = function () {
      vm.options = vm.resolve.options;
      vm.exportSelected = vm.options.selectedRowsCount > 0 ? "1" : "";
      vm.exportFormat = vm.options.preferredType || 'xlsx';
    };

    vm.export = function () {
      vm.close({
        $value: {
          exportSelected: !!vm.exportSelected,
          exportFormat: vm.exportFormat,
        }
      });
    };

    vm.cancel = function () {
      vm.dismiss({confirmed: false});
    };
  }
})();
