;(function () {
  'use strict';

  angular
    .module('app.adpUploader')
    .component('adpPhotoModal', {
      templateUrl: 'app/adp-file-uploader/components/adp-photo-modal/adp-photo-modal.template.html',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: 'AdpPhotoModalController',
      controllerAs: 'vm'
    });
})();