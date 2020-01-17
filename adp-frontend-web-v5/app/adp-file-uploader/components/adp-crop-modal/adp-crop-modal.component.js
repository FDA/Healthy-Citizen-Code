;(function () {
  'use strict';

  angular
    .module('app.adpUploader')
    .component('adpCropModal', {
      templateUrl: 'app/adp-file-uploader/components/adp-crop-modal/adp-crop-modal.template.html',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: 'AdpCropModalController',
      controllerAs: 'vm'
    });
})();