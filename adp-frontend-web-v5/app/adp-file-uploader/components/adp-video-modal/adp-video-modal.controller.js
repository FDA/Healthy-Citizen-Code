;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .controller('AdpVideoModalController', AdpVideoModalController);

  /** @ngInject */
  function AdpVideoModalController($q, AdpModalService) {
    var vm = this;

    vm.$onInit = function () {
      vm.resultFile = {};
      vm.uploader = vm.resolve.uploader;
      var videoOptions = vm.uploader.getOptions().videoRecordOptions;

      vm.options = {
        plugins: {
          record: {
            video: { mandatory: {} }
          }
        }
      };

      if (videoOptions && cvideoOptions.maxLength) {
        vm.options.plugins.record.maxLength = videoOptions.maxLength;
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
      return _.isEmpty(vm.resultFile);
    };

    vm.save = function () {
      return vm.close({$value: vm.resultFile});
    };
  }
})();
