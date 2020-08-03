;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .component('adpAlertModal', {
      templateUrl: 'app/adp-common/directives/adp-alert-modal/adp-alert-modal.html',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controllerAs: 'vm',
      controller: function AdpConfirmDialogModalController() {
        var vm = this;

        vm.$onInit = function () {
          vm.options = vm.resolve.options;
        };

        vm.cancel = function () {
          vm.dismiss({ confirmed: false });
        };
      }
    });
})();
