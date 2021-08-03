(function () {
  'use strict';

  angular.module('app.adpDataExport').factory('AdpDataExport', AdpDataExport);

  /** @ngInject */
  function AdpDataExport(
    AdpClientCommonHelper,
    AdpModalService,
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
        exportConfigModal(gridComponent, schema)
          .then(function(configParams) {
            GridExportHelpers.setPrefType(configParams.format);

            return exportStatusModal({
              schema: schema,
              grid: gridComponent,
              configParams: configParams,
              customGridOptions: customGridOptions
          });
          })
          .catch(function (e) {
            ErrorHelpers.handleError(e, 'Error while exporting.');
          });
        AdpClientCommonHelper.repaintToolbar(gridComponent);
      };
    }

    function exportConfigModal(gridComponent, schema) {
      return AdpModalService.createModal('adpExportConfigModal', {
        schema: schema,
        grid: gridComponent,
        preferredType: GridExportHelpers.getPrefType(),
      }).result;
    }

    function exportStatusModal(params) {
      return AdpModalService.createModal('adpExportStatusModal', params).result;
    }
  }
})();
