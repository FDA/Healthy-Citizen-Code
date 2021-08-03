(function () {
  'use strict';

  angular.module('app.adpOtpConfigControl')
    .controller('AdpOtpBackupCodesController', AdpOtpBackupCodesController);

  /** @ngInject */
  function AdpOtpBackupCodesController(
    AdpModalService,
    AdpOtpHelper
  ) {
    var vm = this;

    vm.$onInit = doInit;
    vm.doGenerate = doGenerate;
    vm.doDelete = doDelete;
    vm.doClose = doClose;
    vm.loading = true;
    vm.codes = [];

    var counter;
    var used;

    function doInit() {
      counter = vm.resolve.options.counter;
      used = vm.resolve.options.used;

      AdpOtpHelper.request(vm, AdpOtpHelper.url.getBackupCodes)
        .then(
        function (data) {
          vm.codes = buildCodesList(data.codes, data.used);
        })
    }

    function doGenerate() {
      confirmReplaceExisting()
        .then(function () {
          return AdpOtpHelper.request(vm, AdpOtpHelper.url.getNewBackupCodes)

        })
        .then(
      function (data) {
        vm.codes = buildCodesList(data.codes, []);
        counter = data.counter;
        used = null;
      })
        .catch(function () {
        });
    }

    function confirmReplaceExisting() {
      var isUnusedCodesExists = vm.codes.length && (!used || vm.codes.length > used.length);

      if (isUnusedCodesExists) {
        return AdpModalService.confirm({
          message: AdpOtpHelper.const.CONFIRM_REPLACE_MSG,
          okButtonText: AdpOtpHelper.const.CONFIRM_REPLACE_BUTTON_LABEL,
        });
      }

      return Promise.resolve();
    }

    function doDelete() {
      AdpModalService.confirm({message: AdpOtpHelper.const.CONFIRM_BACKUP_CLEAR_MSG})
        .then(function () {
          return AdpOtpHelper.request(vm, AdpOtpHelper.url.clearBackupCodes)
        })
        .then(function () {
          vm.codes = [];
          counter = null;
          used = null;
        })
        .catch(function () {
        });
    }

    function doClose(){
      vm.close({$value: {counter: counter, used: used}});
    }

    function buildCodesList(codes, used) {
      return _.map(codes || [], function (code, index) {
        return {value: code, used: used && used.indexOf(index) >= 0}
      })
    }
  }
})();
