;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .component('adpConfirmDialogModal', {
      templateUrl: 'app/adp-common/directives/adp-confirm-dialog-modal/adp-confirm-dialog-modal.html',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: 'AdpConfirmDialogModalController',
      controllerAs: 'vm'
    });
})();