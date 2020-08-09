;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .controller('AdpCropModalController', AdpCropModalController);

  /** @ngInject */
  function AdpCropModalController(
    AdpFilePathService,
    AdpModalService,
    $q
  ) {
    var vm = this;

    vm.$onInit = function () {
      vm.uploader = vm.resolve.uploader;
      vm.options = vm.uploader.getOptions();
      vm.aspectRatio = vm.options.aspectRatio || '';
      vm.items = vm.resolve.items;

      vm.inputImage = '';
      vm.outputImage = '';
      vm.currentItemCropParams = {};
      vm.resultCropParams = [];
      vm.resultCropSources = [];

      prepareNextImage();
    };

    vm.cancel = function () {
      var promise;
      if (vm.resultCropParams.length) {
        promise = AdpModalService.confirm({
          message: 'Are you sure you want to close this window? All unsaved progress will be lost.',
          actionType: 'confirm-close'
        })
      } else {
        promise = $q.when();
      }

      promise
        .then(function () {
          vm.dismiss({$value: 'cancel'});
        });
    };

    vm.next = function () {
      cacheProgress();
      URL.revokeObjectURL(vm.inputImage);
      prepareNextImage();
    };

    vm.save = function () {
      cacheProgress();
      _.each(vm.uploader.queue, updateFileItemData);

      return vm.close();
    };

    function updateFileItemData(fileItem) {
      var fileToUpdate = _.find(vm.resultCropParams, function (cropData) {
        return cropData.id === fileItem._file.id;
      });

      if (!fileToUpdate) {
        return;
      }

      fileItem.formData[0] = {
        'cropParams': fileToUpdate.params
      };

      fileItem._file.cropSrc = fileToUpdate.src;
    }

    function resetCurrentItemParams() {
      delete vm.currentItemCropParams;
      vm.currentItemCropParams = {};
    }

    function cacheProgress() {
      if (vm.current._file.isDummyFile) {
        vm.currentItemCropParams.id = vm.current._file.id;

        vm.current.progress = 0;
        vm.current.isUploaded = false;
        vm.current.isSuccess = false;
      }

      vm.resultCropParams.push({
        id: vm.current._file.id,
        params: JSON.stringify(vm.currentItemCropParams),
        src: vm.outputImage
      });
    }

    function prepareNextImage() {
      vm.current = vm.items.pop();
      resetCurrentItemParams();

      vm.inputImage = vm.current._file.isDummyFile ?
        AdpFilePathService.file(vm.current._file) :
        URL.createObjectURL(vm.current._file);
    }
  }
})();
