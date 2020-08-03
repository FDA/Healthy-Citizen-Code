;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .component('adpCellEditorModal', {
      templateUrl: 'app/adp-generator/directives/adp-cell-editor-modal/adp-cell-editor-modal.html',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: 'AdpCellEditorModalController',
      controllerAs: 'vm'
    });
})();
