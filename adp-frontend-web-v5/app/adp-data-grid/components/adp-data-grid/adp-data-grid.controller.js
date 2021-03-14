;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .controller('adpDataGridController', adpDataGridController);

  /** @ngInject */
  function adpDataGridController(
    GridOptions,
    $element
  ) {
    var vm = this;
    vm.dataGrid = null;
    vm.dataGridOptions = null;

    vm.$onInit = function () {
      var opts = GridOptions.create(vm.schema);
      vm.dataGridOptions = _.merge({}, opts, vm.options);
    };

    vm.$onChanges = function (changeObj) {
      var prevSchema = _.get(changeObj, 'schema.previousValue', null);
      var currentSchema = _.get(changeObj, 'schema.currentValue', null);
      var isSchemaEmpty = !_.keys(prevSchema).length;

      if (isSchemaEmpty || prevSchema === currentSchema) {
        return;
      }

      updateGridOptions(vm.schema, vm.options);
    }

    function updateGridOptions(schema, options) {
      vm.dataGridOptions = _.merge(GridOptions.create(schema), options);
      var gridInstance = $element.find('[dx-data-grid]').dxDataGrid('instance');
      gridInstance && gridInstance.option(vm.dataGridOptions);
    }
  }
})();
