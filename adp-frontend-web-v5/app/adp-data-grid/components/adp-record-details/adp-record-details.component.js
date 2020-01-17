;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .component('adpRecordDetails', {
      templateUrl: 'app/adp-data-grid/components/adp-record-details/adp-record-details.template.html',
      bindings: {
        schema: '<',
        data: '<'
      },
      controller: 'adpRecordDetailsController',
      controllerAs: 'vm'
    });
})();