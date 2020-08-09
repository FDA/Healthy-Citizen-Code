;(function () {
  'use strict';

  angular
    .module('app.adpUploader')
    .directive('adpFileUploaderDropzone', adpFileUploaderDropzone);

  /** @ngInject */
  function adpFileUploaderDropzone(
    AdpFileUploaderService,
    AdpNotificationService,
    AdpUploaderMessages
  ) {
    return {
      restrict: 'A',
      scope: {
        uploader: '=',
        data: '='
      },
      link: function ($scope, $element) {
        $scope.options = $scope.uploader.getOptions();

        var eventNamespace = 'adpFileUploaderDropzone';
        var events = {
          'dragover': 'dragover.' + eventNamespace,
          'dragenter': 'dragenter.' + eventNamespace,
          'dragcancel': ['dragleave.' + eventNamespace, 'dragend.' + eventNamespace].join(' '),
          'drop': 'drop.' + eventNamespace
        };

        if ($scope.options.enableDragAndDrop) {
          bindEvents();
        }

        function bindEvents() {
          var dropzone = $element;


          $(window).on(events.dragover, preventDefault);
          $(window).on(events.drop, preventDefault);

          // allow drop by preventDefault behavior on drop
          dropzone.on(events.dragover, preventDefault);

          dropzone.on(events.dragenter, function (e) {
            preventDefault(e);
            dropzone.addClass('adp-file-uploader-over');
          });

          dropzone.on(events.dragcancel, function (e) {
            preventDefault(e);

            dropzone.removeClass('adp-file-uploader-over');
          });

          dropzone.on(events.drop, function (e) {
            var uploader = $scope.uploader;
            preventDefault(e);

            if (AdpFileUploaderService.isFileAmountLimit(uploader)) {
              return AdpUploaderMessages.showErrorMessage('queueLimit', uploader);
            }

            $scope.uploader.addFiles(e.originalEvent.dataTransfer.files);
            dropzone.removeClass('adp-file-uploader-over');
          });

          $scope.$on('$destroy', unbindEvents);
        }

        function unbindEvents() {
          var dropzone = $element;

          dropzone.off(events.dragover);
          dropzone.off(events.dragenter);
          dropzone.off(events.dragcancel);
          dropzone.off(events.drop);

          $(window).off(events.dragover);
          $(window).off(events.drop);
        }

        function preventDefault(e) {
          e.preventDefault();
          e.stopPropagation();
        }

        function isFileAmountLimit() {
          return $scope.uploader.queue.length >= $scope.uploader.queueLimit ||
            $scope.data.length >= $scope.uploader.queueLimit;
        }

        function showErrorMessage(name) {
          var message = AdpUploaderMessages.getMessage(name, $scope.uploader.getOptions());
          return AdpNotificationService.notifyError(message);
        }
      }
    }
  }
})();
