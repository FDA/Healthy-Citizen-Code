;(function () {
  'use strict';

  angular
    .module('app.adpUploader')
    .component('adpVideoModal', {
      templateUrl: 'app/adp-file-uploader/components/adp-video-modal/adp-video-modal.template.html',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: 'AdpVideoModalController',
      controllerAs: 'vm'
    });
})();