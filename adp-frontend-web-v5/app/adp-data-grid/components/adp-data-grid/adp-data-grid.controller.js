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
      var opts = GridOptions.create(vm.schema);
      vm.dataGridOptions = _.merge({}, opts, vm.options);
    };
  }
})();
