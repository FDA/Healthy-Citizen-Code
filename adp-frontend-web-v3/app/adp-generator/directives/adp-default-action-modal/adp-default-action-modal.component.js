;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .component('adpDefaultActionModal', {
      templateUrl: 'app/adp-generator/directives/adp-default-action-modal/adp-default-action-modal.html',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: 'adpDefaultActionModalController',
      controllerAs: 'vm'
    });
})();