;(function () {
  'use strict';

  angular
    .module('app.adpUploader')
    .directive('adpFileUploaderDropzone', adpFileUploaderDropzone);

  /** @ngInject */
  function adpFileUploaderDropzone(
    AdpFileUploaderService,
    AdpNotificationService,
    AdpUploaderMessages,
    AdpFileDropzoneHelper
  ) {
    return {
      restrict: 'A',
      scope: {
        uploader: '=',
        data: '='
      },
      link: function ($scope, $element) {
        $scope.options = $scope.uploader.getOptions();

        if ($scope.options.enableDragAndDrop) {
          AdpFileDropzoneHelper.bindEvents($element, {
            onDrop: function (e) {
              var uploader = $scope.uploader;

              if (AdpFileUploaderService.isFileAmountLimit(uploader)) {
                return AdpUploaderMessages.showErrorMessage('queueLimit', uploader);
              }

              $scope.uploader.addFiles(e.originalEvent.dataTransfer.files);
            }
          });

          $scope.$on('$destroy', AdpFileDropzoneHelper.getUnbindEvents($element));
        }
      }
    }
  }
})();
