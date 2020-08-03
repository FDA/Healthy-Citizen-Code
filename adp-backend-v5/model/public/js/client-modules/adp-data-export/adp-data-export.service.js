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
      var schema = this.schema;

      gridOptions.onFileSaving = function (e) {
        e.fileName = schema.fullName || 'DataGrid';
      };

      return toolbarWidgetRegister(function (gridComponent) {
        return {
          widget: 'dxMenu',
          options: {
            dataSource: [{ template: AdpClientCommonHelper.getMenuItemTemplate(actionOptions) }],
            cssClass: 'adp-toolbar-menu grid-view-menu',
            onItemClick: createExportDialog(gridComponent, schema),
          },
        };
      });
    };

    function createExportDialog(gridComponent, schema) {
      return function () {
        if (gridComponent.totalCount()) {
          exportModal(gridComponent, schema)
            .then(GridExportHelpers.getExporter(gridComponent, schema))
            .catch(function (e) {
              ErrorHelpers.handleError(e, 'Error while exporting.');
            });
        } else {
          AdpNotificationService.notifyError('There is no records to export');
        }
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
