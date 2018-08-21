;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .component('adpRecordFormModal', {
      templateUrl: 'app/adp-generator/directives/adp-record-form-modal/adp-record-form-modal.html',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: 'AdpRecordModalController',
      controllerAs: 'vm'
    });
})();