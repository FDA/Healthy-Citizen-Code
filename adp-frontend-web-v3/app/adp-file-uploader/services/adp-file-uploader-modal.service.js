;(function () {
  'use strict';

  angular
    .module('app.adpUploader')
    .factory('AdpFileUploaderModalService', AdpFileUploaderModalService);

  /** @ngInject */
  function AdpFileUploaderModalService($uibModal) {
    function cropModal(items) {
      if (!items.length) return;

      return $uibModal.open({
        backdrop: 'static',
        size: 'lg',
        component: 'adpCropModal',
        resolve: {
          items: function () {
            return items;
          },
          uploader: function () {
            return items[0].uploader;
          }
        }
      }).result;
    }

    function mediaModal(name, uploader) {
      return $uibModal.open({
        backdrop: 'static',
        size: 'lg',
        component: name,
        resolve: {
          uploader: function () {
            return uploader;
          }
        }
      }).result;
    }

    return {
      cropModal: cropModal,
      audioModal: mediaModal.bind(this, 'adpAudioModal'),
      videoModal: mediaModal.bind(this, 'adpVideoModal'),
      photoModal: mediaModal.bind(this, 'adpPhotoModal')
    };
  }
})();
