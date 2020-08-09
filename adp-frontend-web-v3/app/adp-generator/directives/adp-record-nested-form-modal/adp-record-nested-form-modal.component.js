;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .component('adpRecordNestedFormModal', {
      templateUrl: 'app/adp-generator/directives/adp-record-nested-form-modal/adp-record-nested-form-modal.html',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: 'AdpRecordNestedModalController',
      controllerAs: 'vm'
    });
})();