;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .component('adpDataGrid', {
      templateUrl: 'app/adp-data-grid/components/adp-data-grid/adp-data-grid.template.html',
      bindings: {
        schema: '<',
        options: '<',
      },
      controller: 'adpDataGridController',
      controllerAs: 'vm'
    });
})();
