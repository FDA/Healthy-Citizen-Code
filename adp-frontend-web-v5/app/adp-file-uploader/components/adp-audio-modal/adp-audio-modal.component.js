;(function () {
  'use strict';

  angular
    .module('app.adpUploader')
    .component('adpAudioModal', {
      templateUrl: 'app/adp-file-uploader/components/adp-audio-modal/adp-audio-modal.template.html',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: 'AdpAudioModalController',
      controllerAs: 'vm'
    });
})();