;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .controller('AdpExportConfigModalController', AdpExportConfigModalController);

  /** @ngInject */
  function AdpExportConfigModalController(
    GridExportHelpers
  ) {
    var vm = this;

    vm.$onInit = function () {
      vm.options = vm.resolve.options;

      var schema = vm.options.schema;
      var grid = vm.options.grid;
      var selectionMultiple = _.get(schema, 'parameters.selection.mode', '');
      var selectedRowsCount = selectionMultiple === 'multiple' ? grid.getSelectedRowKeys().length : 0;
      var totalRowsCount = grid.totalCount();
      var columns = GridExportHelpers.gridVisibleColumns(grid);
      var defaultName = 'Export from ' + (schema.fullName || schema.schemaName);
      var defaultDescription = 'Columns: ' + columns.join(',') + ';\nCreated: ' + (new Date).toString();

      vm.data = {
        rowsToExport: selectedRowsCount > 0 ? 'selected' : 'all',
        format: vm.options.preferredType || 'xlsx',
        name: defaultName,
        description: defaultDescription
      };

      var rowsToExportOptions = {
        all: 'Export all rows (' + totalRowsCount + ')',
      };

      if (selectedRowsCount > 0) {
        rowsToExportOptions.selected = 'Export selected rows only (' + selectedRowsCount + ')';
      }

      vm.schema = {
        type: 'Schema',
        fields: {
          rowsToExport: {
            type: "String",
            description: "Which rows to export",
            fullName: "Rows to export",
            fieldName: "rowsToExport",
            list: rowsToExportOptions,
            default: 'all',
            showInForm: true,
            required: true,
            fieldInfo: {write: true, read: true}
          },
          format: {
            type: "String",
            fieldName: "format",
            fullName: "Export into",
            list: GridExportHelpers.getExportFormats(),
            showInForm: true,
            required: true,
            fieldInfo: {write: true, read: true}
          },
          name: {
            type: "String",
            fieldName: "name",
            fullName: "Name",
            default: defaultName,
            show: "this.row.format=='db'",
            showInForm: true,
            required: "this.row.format=='db'",
            fieldInfo: {write: true, read: true}
          },
          description: {
            type: "Text",
            fieldName: "description",
            fullName: "Description",
            default: defaultDescription,
            show: "this.row.format=='db'",
            showInForm: true,
            fieldInfo: {write: true, read: true}
          },
        }
      };
      vm.fields = vm.schema.fields;
    };

    vm.submit = function (formData) {
      vm.close({
        $value: formData
      });
    };

    vm.cancel = function () {
      vm.dismiss({confirmed: false});
    };
  }
})();
