;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .component('adpGridViewManager', {
      templateUrl: 'app/adp-data-grid/directives/adp-grid-view-manager/adp-grid-view-manager.html',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: 'AdpGridViewManagerController',
      controllerAs: 'vm'
    });
})();
