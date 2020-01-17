;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .controller('adpDataGridController', adpDataGridController);

  /** @ngInject */
  function adpDataGridController(
    GridOptions
  ) {
    var vm = this;
    vm.dataGridOptions = null;
    vm.$onInit = function onInit() {
      vm.dataGridOptions = GridOptions.create(vm.schema);
    };

  }
})();
