;(function () {
  'use strict';

  angular
    .module('app.hcGenerator')
    .component('hcRecordFormModal', {
      templateUrl: 'app/hc-generator/directives/hc-record-form-modal/hc-record-form-modal.html',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: 'HcRecordModalController',
      controllerAs: 'vm'
    });
})();