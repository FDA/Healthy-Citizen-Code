(function () {
  angular.module('app.adpSyntheticGenerate', []).factory('AdpSyntheticGenerate', AdpSyntheticGenerate);

  /** @ngInject */
  function AdpSyntheticGenerate(
    AdpNotificationService,
    AdpClientCommonHelper,
    AdpModalService,
    AdpSocketIoService,
    APP_CONFIG,
    $http,
    $timeout
  ) {
    return function (toolbarWidgetRegister) {
      var schema = this.schema;
      var actionOptions = this.actionOptions;

      return toolbarWidgetRegister(function (gridComponent) {
        return {
          widget: 'dxMenu',
          options: {
            dataSource: [{ template: AdpClientCommonHelper.getMenuItemTemplate(actionOptions) }],
            cssClass: 'adp-toolbar-menu grid-view-menu',
            onItemClick: function () {
              doOpenGenerator(schema, gridComponent);
            },
          },
        };
      });
    };

    function doOpenGenerator(schema, gridComponent) {
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
          if (res.data.success) {
            //       AdpSocketIoService.registerMessageProcessor(getSocketMessageProcessor(res.data.data.jobId, gridComponent))
            //       AdpNotificationService.notifySuccess('Generation is started successfully');
          } else {
            AdpNotificationService.notifyError(res.data.message, 'Generation job failed');
          }

          $timeout(function () {
            gridComponent.refresh();
          }, 3000);
        });
      });
    }

    function getSocketMessageProcessor(jobId, gridComponent) {
      var processor = function (data) {
        if (data.type === 'backgroundJobs' && data.data.jobId === jobId) {
          if (_.includes(['error', 'completed'], data.data.status)) {
            if (data.data.status === 'error') {
              AdpNotificationService.notifyError(data.message, 'Generation job failed');
            } else {
              AdpNotificationService.notifySuccess('Records are generated successfully');
            }

            AdpSocketIoService.unRegisterMessageProcessor(processor);
            gridComponent.refresh();
          }

          return false; // this blocks all following processors for this message
        }
      };

      return processor;
    }
  }
})();
