;(function () {
  'use strict';

  angular
    .module('app.adpUploader')
    .directive('adpFileUploader', adpFileUploader);

  /** @ngInject */
  function adpFileUploader(
    AdpFileUploaderModalService,
    AdpFileUploaderService,
    AdpUploaderMessages,
    Guid
  ) {
    return {
      restrict: 'E',
      scope: {
        data: '=',
        field: '=',
        fileRequired: '='
      },
      require: '^^form',
      templateUrl: 'app/adp-file-uploader/directives/adp-file-uploader/adp-file-uploader.template.html',
      link: function ($scope, $elem, $attr, form) {
        var unbind = $scope.$watch("adpField", function () {
          init();
          unbind();
        });

        function init() {
          $scope.uploader = AdpFileUploaderService.create($scope.field, $scope.data);
          $scope.options = $scope.uploader.getOptions();
          $scope.$emit('adpFileUploaderInit');

          bindEvents();
          if ($scope.fileRequired) {
            addValidator();
          }
        }

        function bindEvents() {
          $scope.uploader.onSuccessItem = onSuccessFileUpload;
          $scope.uploader.onCompleteAll = onUploadCompeleteAll;

          $scope.$on('adpFileUploadStart', startUpload);
        }

        function addValidator() {
          var modelRef = form[$scope.field.keyName];
          modelRef.$options = {
            allowInvalid: true
          };

          $scope.$watch(function() {
            return $scope.uploader.queue && $scope.uploader.queue.length;
          }, modelRef.$validate);

          modelRef.$validators.required = function() {
            var arr = $scope.uploader.queue;
            if(!arr) { return false; }

            return arr.length > 0;
          };
        }

        function startUpload() {
          var filesToUpload = $scope.uploader.getNotUploadedItems().filter(function(item) {
            return !item.isUploading;
          });

          if ($scope.uploader.queue.length === 0 || filesToUpload.length === 0) {
            $scope.$emit('adpFileUploadComplete');
            return;
          }
          $scope.uploader.uploadAll();
        }

        function onSuccessFileUpload(item, response) {
          if (!response.success) {
            item.isSuccess = false;
            item.isUploaded = false;
            return $scope.$emit('adpFileUploadError', response);
          }

          if (Guid.isGuid(item._file.id)) {
            create(item, response);
          } else {
            update(item, response);
          }
        }

        function create(item, response) {
          var fileItem = {
            name: item.file.name,
            size: item.file.size,
            type: item.file.type,
            id: response.data[0].id,
            cropped: response.data[0].cropped
          };

          $scope.data.push(fileItem);
          $scope.$apply();
        }

        function update(item, response) {
          var itemToUpdate = _.find($scope.data, function (fileItem) {
            return fileItem.id === item._file.id;
          });

          itemToUpdate.cropped = response.data[0].cropped;
        }

        function onUploadCompeleteAll() {
          $scope.$emit('adpFileUploadComplete');
        }

        $scope.callAudioModal = callModal.bind(this, 'audioModal');
        $scope.callVideoModal = callModal.bind(this, 'videoModal');
        $scope.callPhotoModal = callModal.bind(this, 'photoModal');

        function callModal(name) {
          if (AdpFileUploaderService.isFileAmountLimit($scope.uploader)) {
            return AdpUploaderMessages.showErrorMessage('queueLimit', $scope.uploader);
          }

          AdpFileUploaderModalService[name]($scope.uploader)
            .then(function(blob) {
              return new File([blob], blob.name, {type: blob.type})
            })
            .then($scope.uploader.addFiles.bind($scope.uploader));
        }
      }
    }
  }
})();
