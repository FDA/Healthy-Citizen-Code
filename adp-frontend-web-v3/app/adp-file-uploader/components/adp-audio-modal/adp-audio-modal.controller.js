;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .controller('AdpAudioModalController', AdpAudioModalController);

  /** @ngInject */
  function AdpAudioModalController($q, AdpModalService) {
    var vm = this;

    vm.$onInit = function () {
      vm.resultFile = {};
      vm.audioOptions = {};
      vm.uploader = vm.resolve.uploader;

      var audioOptions = vm.resolve.uploader.getOptions().audioRecordOptions;

      vm.options = {
        plugins: {
          record: {}
        }
      };

      if (audioOptions && audioOptions.maxLength) {
        vm.options.plugins.record.maxLength = audioOptions.maxLength;
      }
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

    vm.isEmpty = function () {
      return _.isEmpty(vm.resultFile)
    };

    vm.save = function () {
      return vm.close({$value: vm.resultFile});
    };
  }
})();
