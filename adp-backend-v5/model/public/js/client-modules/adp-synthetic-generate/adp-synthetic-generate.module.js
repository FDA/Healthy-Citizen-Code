(function () {
  angular.module('app.adpSyntheticGenerate', []).factory('AdpSyntheticGenerate', AdpSyntheticGenerate);

  /** @ngInject */
  function AdpSyntheticGenerate(
    AdpNotificationService,
    AdpClientCommonHelper,
    AdpModalService,
    AdpSocketIoService,
    APP_CONFIG,
    $http
  ) {
    return function (toolbarWidgetRegister) {
      var schema = this.modelSchema;
      var actionOptions = this.actionOptions;

      return toolbarWidgetRegister(function (gridComponent) {
        return {
          widget: 'dxMenu',
          options: {
            dataSource: [{ template: AdpClientCommonHelper.getMenuItemTemplate(actionOptions) }],
            cssClass: 'adp-toolbar-menu grid-view-menu',
            onItemClick: function () {
              doOpenGenerator(schema);
              AdpClientCommonHelper.repaintToolbar(gridComponent);
            },
          },
        };
      });
    };

    function doOpenGenerator(schema) {
      AdpModalService.createModal('adpGenModal', {
        schema: schema,
      }).result.then(function (res) {
        var body = {
          args: {
            batchName: res.batchName,
            count: res.recordsNum,
            collectionName: schema.schemaName,
          },
        };

        $http.post(APP_CONFIG.apiUrl + '/scgRun', body).then(function (res) {
          if (!res.data.success) {
            AdpNotificationService.notifyError(res.data.message, 'Generation job failed');
          }
        });
      });
    }
  }
})();
