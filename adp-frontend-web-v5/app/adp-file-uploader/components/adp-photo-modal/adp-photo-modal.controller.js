;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .controller('AdpPhotoModalController', AdpPhotoModalController);

  /** @ngInject */
  function AdpPhotoModalController(
    AdpFileManagerService,
    AdpModalService,
    $q
  ) {
    var vm = this;

    vm.$onInit = function () {
      vm.player = null;
      vm.resultFile = {};
      vm.uploader = vm.resolve.uploader;
    };

    vm.cancel = function () {
      var promise;
      if (vm.isEmpty()) {
        promise = $q.when();
      } else {
        promise = AdpModalService.confirm({
          message: 'Are you sure you want to close this window? All unsaved progress will be lost.',
          actionType: 'confirm-close'
        });
      }

      promise
        .then(function () {
          vm.dismiss({$value: 'cancel'});
        });
    };

    vm.capturePhoto = function () {
      vm.player.record().createSnapshot();
    };

    vm.retryPhoto = function () {
      vm.resultFile = {};
      vm.player.record().retrySnapshot();
    };

    vm.isEmpty = function () {
      return _.isEmpty(vm.resultFile)
    };

    vm.save = function () {
      var blob = AdpFileManagerService.dataURItoFile(vm.resultFile);
      return vm.close({$value: blob});
    };
  }
})();
