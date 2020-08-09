;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .controller('AdpThumbController', AdpThumbController);

  /** @ngInject */
  function AdpThumbController(
    AdpFileManagerService,
    AdpFilePathService,
    AdpMimeService
  ) {
    var vm = this;
    var currentCropSrc;

    vm.$onInit = function () {
      vm.fileType = AdpMimeService.getFileType(vm.fileItem.name);

      if (vm.fileType === 'images') {
        getImageSource(vm.fileItem);
        vm.src += '?v=' + new Date().valueOf();
        vm.fileItem.cropSrc = vm.src;
        currentCropSrc = vm.src;

        vm.$doCheck = doCheck;
      }
    };

    function doCheck() {
      if (currentCropSrc !== vm.fileItem.cropSrc) {
        currentCropSrc = vm.fileItem.cropSrc;
        vm.src = vm.fileItem.cropSrc;
      }
    }

    function getImageSource(fileItem) {
      // uploaded
      if (fileItem.isDummyFile) {
        vm.src = fileItem.cropped ? AdpFilePathService.cropped(fileItem) : AdpFilePathService.thumb(fileItem);
        return;
      }

      // croped on client
      if (vm.fileItem.cropSrc) {
        vm.src = vm.fileItem.cropSrc;
        return;
      }

      // not cropped, not uploaded
      AdpFileManagerService.imgFileObjectToDataURI(fileItem)
        .then(function(dataURI) {
          vm.src = dataURI;
        });
    }
  }
})();
