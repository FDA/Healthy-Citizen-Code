;(function () {
  "use strict";

  angular
    .module("app.adpDataGrid")
    .factory("GridExportService", GridExport);

  /** @ngInject */
  function GridExport(
    AdpModalService,
    AdpNotificationService,
    AdpUnifiedArgs,
    ErrorHelpers,
    GridOptionsHelpers,
    GridExportHelpers
  ) {
    return function (options, schema) {
      if (_.get(options, "export.enabled")) {
        GridOptionsHelpers.addToolbarHandler(options, function (e) {
          e.toolbarOptions.items.push(
            {
              widget: "dxButton",
              options: {
                icon: "export",
                hint: "Export",
                onClick: createExportDialog(e.component, schema)
              },
              name: "exportButton",
            });
        });

        options.export.enabled = false;

        options.onFileSaving = function (e) {
          e.fileName = schema.fullName || 'DataGrid';
        };
      }
    };

    function createExportDialog(gridComponent, schema) {
      return function () {
        if (gridComponent.totalCount()) {
          exportModal(gridComponent, schema)
            .then(GridExportHelpers.getExporter(gridComponent, schema))
            .catch(function (e) {
              ErrorHelpers.handleError(e, "Error while exporting.");
            })
        } else {
          AdpNotificationService.notifyError("There is no records to export");
        }
      };
    }

    function exportModal(gridComponent, schema) {
      return AdpModalService
        .createModal("adpExportConfigModal",
          {
            schema: schema,
            grid: gridComponent,
            preferredType: GridExportHelpers.getPrefType(),
          })
        .result;
    }
  }
})();
