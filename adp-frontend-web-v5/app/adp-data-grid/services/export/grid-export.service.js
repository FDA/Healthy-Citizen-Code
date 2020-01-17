;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridExportService', GridExport);

  /** @ngInject */
  function GridExport(
    AdpModalService,
    AdpNotificationService,
    AdpUnifiedArgs,
    GridOptionsHelpers,
    GridExportHelpers
  ) {
    return function (options, schema) {
      if (_.get(options, "export.enabled")) {
        GridOptionsHelpers.addToolbarHandler(options, function (e) {
          e.toolbarOptions.items.push(
            {
              widget: 'dxButton',
              options: {
                icon: 'export',
                hint: 'Export',
                onClick: createExportDialog(e.component, schema)
              },
              location: 'after'
            });
        });

        options.export.enabled = false;
      }
    };

    function createExportDialog(gridComponent, schema) {
      return function () {
        exportModal(gridComponent, schema).then(doExport(gridComponent, schema))
      };
    }

    function exportModal(gridComponent, schema) {
      var selectionMultiple = _.get(schema, 'parameters.selection.mode', '');
      var selectedRowsCount = selectionMultiple === 'multiple' ? gridComponent.getSelectedRowKeys().length : 0;

      return AdpModalService
        .createModal('adpExportConfigModal',
          {
            collectionName: schema.fullName,
            preferredType: GridExportHelpers.getPrefType(),
            selectedRowsCount: selectedRowsCount,
            totalRowsCount: gridComponent.totalCount()
          })
        .result;
    }

    function doExport(gridComponent, schema) {
      return function (params) {
        var workbook = new ExcelJS.Workbook();
        var worksheet = workbook.addWorksheet('Main');
        var fileFormat = params.exportFormat;
        var fileName = schema.fullName + '.' + fileFormat;

        DevExpress.excelExporter.exportDataGrid({
          component: gridComponent,
          worksheet: worksheet,
          selectedRowsOnly: params.exportSelected,
          customizeCell: GridExportHelpers.getCellCustomizer(schema, fileFormat),
        }).then(function () {
          var processor = GridExportHelpers.getProcessor(fileFormat);

          if (processor) {
            return processor(workbook);
          }
          throw new Error('No format processor found for ' + fileFormat);
        }).then(function (buffer) {
          GridExportHelpers.saveData(buffer, fileFormat, fileName);
        }).catch(function (e) {
          throw e;
        });

        GridExportHelpers.setPrefType(fileFormat);
      };
    }
  }
})();
