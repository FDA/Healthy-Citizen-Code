;(function () {
  'use strict';

  angular
    .module('app.adpUploader')
    .directive('adpFileUploaderList', adpFileUploaderList);

  /** @ngInject */
  function adpFileUploaderList(
    AdpFileUploaderModalService,
    AdpFilePathService,
    AdpMimeService
  ) {
    return {
      restrict: 'E',
      scope: {
        uploader: '=',
        data: '='
      },
      templateUrl: 'app/adp-file-uploader/directives/adp-file-uploader-list/adp-file-uploader-list.template.html',
      link: function ($scope) {
        $scope.options = $scope.uploader.getOptions();

        $scope.crop = function (item) {
          AdpFileUploaderModalService.cropModal([item]);
        };

        $scope.isCropEnabled = function (item) {
          return $scope.isImage(item) && $scope.options.enableCropper;
        };

        $scope.isImage = function(item) {
          return AdpMimeService.isImage(item.file.name);
        };

        $scope.remove = function (item) {
          if (item._file.id) {
            _.remove($scope.data, function (itemData) {
              return itemData.id === item._file.id;
            });
          }

          item.remove();
        }

        $scope.getDownloadUrl = function(item){
          return AdpFilePathService.download(item._file)
        }
      }
    }
  }
})();
