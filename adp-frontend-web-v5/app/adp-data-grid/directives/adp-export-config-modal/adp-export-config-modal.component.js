;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .component('adpExportConfigModal', {
      templateUrl: 'app/adp-data-grid/directives/adp-export-config-modal/adp-export-config-modal.html',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: 'AdpExportConfigModalController',
      controllerAs: 'vm'
    });
})();
