;(function () {
  'use strict';

  angular
    .module('app.hcCommon')
    .component('hcConfirmDialogModal', {
      templateUrl: 'app/hc-common/directives/hc-confirm-dialog-modal/hc-confirm-dialog-modal.html',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: 'HcConfirmDialogModalController',
      controllerAs: 'vm'
    });
})();