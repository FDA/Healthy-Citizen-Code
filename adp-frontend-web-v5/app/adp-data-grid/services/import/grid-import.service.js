;(function () {
  "use strict";

  angular
    .module("app.adpDataGrid")
    .factory("GridImportService", GridImport);

  /** @ngInject */
  function GridImport(
    AdpSessionService,
    AdpModalService,
    AdpNotificationService,
    GraphqlCollectionMutator,
    AdpUnifiedArgs,
    ErrorHelpers,
    ServerError,
    ResponseError,
    AdpFileUploaderService,
    GridOptionsHelpers
  ) {
    return function (options, schema) {
      if (_.get(options, "import.enabled")) {
        GridOptionsHelpers.addToolbarHandler(options, function (e) {
          e.toolbarOptions.items.push(
            {
              widget: "dxButton",
              options: {
                icon: "newfolder",
                hint: "Import",
                onClick: createImportDialog(e.component, schema)
              },
              name: "importButton",
            });
        });
      }
    };

    function createImportDialog(gridComponent, schema) {
      return function () {
        AdpModalService.upload({
          title: "Import data",
          readFile: false,
          validate: function (file) {
            if (!["text/csv", "application/json"].includes(file.type)) {
              return "Only CSV/JSON files allowed";
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
              uploader.onErrorItem = function(item, response) {
                reject(new ResponseError("File upload error: " + response));
              };
              uploader.uploadAll();
            })
          })
          .then(function (uploadedFile) {
            return GraphqlCollectionMutator.importDataSet(schema, uploadedFile);
          })
          .then(function (data) {
            gridComponent.refresh();
            AdpModalService.createModal("adpImportReportModal", {
              errors: data.errors,
              rowsCount: data.importedRowsNumber
            });
          })
          .catch(function (err) {
            ErrorHelpers.handleError(err, "Error while importing.");
          });
      }
    }
  }
})();
