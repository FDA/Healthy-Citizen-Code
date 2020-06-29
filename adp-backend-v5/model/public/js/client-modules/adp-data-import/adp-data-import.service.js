(function () {
  'use strict';

  angular.module('app.adpDataImport').factory('AdpDataImport', AdpDataImport);

  /** @ngInject */
  function AdpDataImport(
    AdpClientCommonHelper,
    AdpModalService,
    GraphqlCollectionMutator,
    ErrorHelpers,
    ResponseError,
    AdpFileUploaderService
  ) {
    return function (toolbarWidgetRegister) {
      var actionOptions = this.actionOptions;
      var schema = this.schema;

      return toolbarWidgetRegister(function (gridComponent) {
        return {
          widget: 'dxMenu',
          options: {
            dataSource: [{ template: AdpClientCommonHelper.getMenuItemTemplate(actionOptions) }],
            cssClass: 'adp-toolbar-menu grid-view-menu',
            onItemClick: createImportDialog(gridComponent, schema),
          },
        };
      });
    };

    function createImportDialog(gridComponent, schema) {
      return function () {
        AdpModalService.readFile({
          title: 'Import data',
          readFile: false,
          validate: function (file) {
            if (!file.name.match(/\.(csv|json)$/i)) {
              return 'Only CSV/JSON files allowed';
            }
          },
        })
          .then(function (file) {
            return new Promise(function (resolve, reject) {
              var uploader = AdpFileUploaderService.createStandalone();

              uploader.addToQueue(file);
              uploader.onSuccessItem = function (item, response) {
                if (!response.success) {
                  reject(response);
                } else {
                  resolve(response.data[0]);
                }
              };
              uploader.onErrorItem = function (item, response) {
                reject(new ResponseError('File upload error: ' + response));
              };
              uploader.uploadAll();
            });
          })
          .then(function (uploadedFile) {
            return GraphqlCollectionMutator.importDataSet(schema, uploadedFile);
          })
          .then(function (data) {
            gridComponent.refresh();
            AdpModalService.createModal('adpImportReportModal', {
              errors: data.errors,
              rowsCount: data.importedRowsNumber,
            });
          })
          .catch(function (err) {
            ErrorHelpers.handleError(err, 'Error while importing.');
          });
      };
    }
  }
})();
