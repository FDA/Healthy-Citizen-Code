;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .component('adpRecordDetailsModal', {
      templateUrl: 'app/adp-generator/directives/adp-record-details-modal/adp-record-details-modal.html',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: 'AdpRecordDetailsModalController',
      controllerAs: 'vm'
    });
})();