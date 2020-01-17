;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .controller('AdpConfirmDialogModalController', AdpConfirmDialogModalController);

  /** @ngInject */
  function AdpConfirmDialogModalController() {
    var vm = this;

    vm.$onInit = function () {
      vm.options = vm.resolve.options;
    };

    vm.confirm = function () {
      vm.close({ confirmed: true });
    };

    vm.cancel = function () {
      vm.dismiss({ confirmed: false });
    };
  }
})();
