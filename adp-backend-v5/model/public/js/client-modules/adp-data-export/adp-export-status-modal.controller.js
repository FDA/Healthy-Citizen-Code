(function () {
  'use strict';

  angular.module('app.adpDataExport')
    .controller('AdpExportStatusModalController', AdpExportStatusModalController);

  /** @ngInject */
  function AdpExportStatusModalController(
    GridExportHelpers,
    AdpMediaTypeHelper,
    AdpSocketIoService,
    AdpNotificationService,
    AdpSchemaService,
    AdpTime,
    ErrorHelpers,
    GraphqlCollectionMutator,
    $timeout,
    $location,
    $state
  ) {
    var vm = this;
    var downloadPermission = true;
    var viewExportsPermission = true;
    var viewDatasetPermission = true;
    var exportFormat = null;
    var instantDownloadTimeout = _.get(window.adpAppStore.appInterface(), 'app.dataExportInstantDownloadTimeout', 3000);
    var longRunTimer;

    vm.$onInit = function () {
      var exportsSchema = AdpSchemaService.getSchemaByName('_exports');

      vm.options = vm.resolve.options;// options contains {schema, grid: gridComponent, configParams, customGridOptions }
      vm.status = 'start';
      vm.datasetAllowed = false;
      vm.downloadAllowed = false;
      vm.showResultsCollection = false;

      viewDatasetPermission = _.hasIn(exportsSchema.actions, 'fields.view');

      exportFormat = vm.options.configParams.format;

      vm.ok = function () {
        return vm.dismiss({confirmed: false});
      };

      vm.download = doDownload;
      vm.goToDataset = goToDataset;

      var exportMutationParams = getExportParams(vm.options);

      return GraphqlCollectionMutator.create(exportsSchema, exportMutationParams)
        .then(function (data) {
          longRunTimer = $timeout(onLongRunTimer, instantDownloadTimeout);

          _setSocketListener(exportFormat, data._id);
        })
        .catch(function (error) {
          var message = _.isArray(error.message) ? error.message.join(',') : (error.message || 'Unknown error');

          vm.status = 'error';
          vm.errorMessage = message;

          ErrorHelpers.handleError(error, 'Unknown error, while trying to export dataset');
          throw error;
        });
    };

    function getExportParams(params) {
      return {
        name: params.configParams.name,
        description: params.configParams.description,
        exportSpecification: {
          modelName: params.schema.schemaName,
          filter: {
            dxQuery: JSON.stringify(GridExportHelpers.gridFilterCondition(params)),
          },
          projections: GridExportHelpers.gridVisibleColumns(params.grid),
          timezone: AdpTime.guessTimeZone(),
        },
        exportType: params.configParams.format,
      };
    }

    function onLongRunTimer() {
      if (vm.status === 'start') {
        vm.status = 'long';
        vm.showResultsCollection = viewExportsPermission;
      }
    }

    function doDownload() {
      var fileItem = { id: vm.resultItemId };
      AdpMediaTypeHelper.downloadWithSaveDialog(fileItem);

      doDialogClose();
    }

    function goToDataset() {
      $state.go('app.datasetsId', getDatasetsPageParams());
    }

    function getDatasetUrl() {
      return $state.href('app.datasetsId', getDatasetsPageParams());
    }

    function getDatasetsPageParams() {
      return { _id: vm.resultItemId };
    }

    function getFileUrl() {
      var fileItem = {
        id: vm.resultItemId,
      }

      return AdpMediaTypeHelper.getDownLoadLink(fileItem);
    }

    function getResultMessage(resultUrl) {
      // todo: fix
      return 'Export completed. <br><a href="' + resultUrl + '">Get result here</a>';
    }

    function doDialogClose() {
      $timeout.cancel(longRunTimer);

      vm.dismiss({confirmed: false});
    }

    function _socketIoListenerFunc(data) {
      if (exportFormat === 'db') {
        _socketProcessorDbType(data);
      } else {
        _socketProcessorFileType(data);
      }
    }

    function _socketProcessorFileType(data) {
      if (data.type === 'exportDataToFile' && data.data.status === 'completed') {
        vm.resultItemId = data.data.fileId ;

        if (vm.status === 'start') {
          doDownload();
        } else {
          vm.status = 'finish';
          vm.showResultsCollection = false;
          vm.downloadAllowed = downloadPermission;
        }

        getFileUrl().then(function(url){
          var completeMessage = getResultMessage(url);

          AdpNotificationService.notifySuccess(completeMessage);
        })


        _removeSocketListener();
      }
    }

    function _socketProcessorDbType(data) {
      if (data.type === 'exportDataToDb' && data.data.status === 'completed') {
        vm.resultItemId = data.data.datasetId ;

        vm.status = 'finish';
        vm.showResultsCollection = false;
        vm.datasetAllowed = viewDatasetPermission;

        var completeMessage = getResultMessage(getDatasetUrl());
        AdpNotificationService.notifySuccess(completeMessage);

        _removeSocketListener();
      }
    }

    function _setSocketListener(exportFormat, recordId) {
      AdpSocketIoService.registerMessageProcessor(_socketIoListenerFunc, {id: recordId});
    }

    function _removeSocketListener() {
      AdpSocketIoService.unRegisterMessageProcessor(_socketIoListenerFunc);
    }
  }
})();
