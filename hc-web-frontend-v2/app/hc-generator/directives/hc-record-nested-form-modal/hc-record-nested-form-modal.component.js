;(function () {
  'use strict';

  angular
    .module('app.hcGenerator')
    .component('hcRecordNestedFormModal', {
      templateUrl: 'app/hc-generator/directives/hc-record-nested-form-modal/hc-record-nested-form-modal.html',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: 'HcRecordNestedModalController',
      controllerAs: 'vm'
    });
})();