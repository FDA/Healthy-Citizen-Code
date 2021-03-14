(function () {
  'use strict';

  angular.module('app.adpDataExport').factory('AdpDataExport', AdpDataExport);

  /** @ngInject */
  function AdpDataExport(
    AdpClientCommonHelper,
    AdpModalService,
    AdpNotificationService,
    AdpUnifiedArgs,
    ErrorHelpers,
    GridExportHelpers
  ) {
    return function (toolbarWidgetRegister) {
      var gridOptions = this.gridOptions;
      var actionOptions = this.actionOptions;
      var schema = this.modelSchema;
      var customGridOptions = this.customGridOptions;

      gridOptions.onFileSaving = function (e) {
        e.fileName = schema.fullName || 'DataGrid';
      };

      return toolbarWidgetRegister(function (gridComponent) {
        return {
          widget: 'dxMenu',
          options: {
            dataSource: [{ template: AdpClientCommonHelper.getMenuItemTemplate(actionOptions) }],
            cssClass: 'adp-toolbar-menu grid-view-menu',
            onItemClick: createExportDialog(gridComponent, schema, customGridOptions),
          },
        };
      });
    };

    function createExportDialog(gridComponent, schema, customGridOptions) {
      return function () {
        exportModal(gridComponent, schema)
          .then(GridExportHelpers.getExporter(gridComponent, schema, customGridOptions))
          .catch(function (e) {
            ErrorHelpers.handleError(e, 'Error while exporting.');
          });
        AdpClientCommonHelper.repaintToolbar(gridComponent);
      };
    }

    function exportModal(gridComponent, schema) {
      return AdpModalService.createModal('adpExportConfigModal', {
        schema: schema,
        grid: gridComponent,
        preferredType: GridExportHelpers.getPrefType(),
      }).result;
    }
  }
})();
