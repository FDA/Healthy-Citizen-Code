;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .controller('AdpThumbController', AdpThumbController);

  /** @ngInject */
  function AdpThumbController(
    AdpFileManagerService,
    AdpMimeService,
    AdpMediaTypeHelper
  ) {
    var vm = this;
    var currentCropSrc;

    vm.$onInit = function () {
      vm.fileType = AdpMimeService.getFileType(vm.fileItem.name);
      if (vm.fileType !== 'images') {
        return;
      }
      vm.src = '';
      vm.$doCheck = doCheck;

      getImageSource(vm.fileItem)
        .then(function (dataURI) {
          vm.src = dataURI;
          vm.fileItem.cropSrc = vm.src;
          currentCropSrc = vm.src;
        });
    };

    function doCheck() {
      if (currentCropSrc !== vm.fileItem.cropSrc) {
        currentCropSrc = vm.fileItem.cropSrc;
        vm.src = vm.fileItem.cropSrc;
      }
    }

    function getImageSource(fileItem) {
      var croppedOnClient = !!vm.fileItem.cropSrc;
      if (croppedOnClient) {
        return vm.fileItem.cropSrc;
      }

      var fileUploaded = !!fileItem.isDummyFile;
      if (fileUploaded) {
        var fnName = fileItem.cropped ? 'getCroppedImgLink' : 'getThumbImgLink';
        return AdpMediaTypeHelper[fnName](fileItem);
      }

      return AdpFileManagerService.imgFileObjectToDataURI(fileItem);
    }
  }
})();
