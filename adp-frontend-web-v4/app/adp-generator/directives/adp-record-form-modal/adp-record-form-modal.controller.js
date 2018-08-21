;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .controller('AdpRecordModalController', AdpRecordModalController);

  /** @ngInject */
  function AdpRecordModalController(AdpDataService) {
    var vm = this;

    vm.$onInit = function () {
      vm.fields = vm.resolve.options.fields;
      vm.formParams = vm.resolve.options.formParams;
      vm.data = vm.resolve.options.data || {};
      vm.link = vm.resolve.options.link;

      vm.id = vm.data._id || null;
      vm.isNewRecord = vm.formParams.actionType === 'create' || vm.formParams.actionType === 'clone';
      vm.action = vm.isNewRecord ? 'Add' : 'Update';
    };

    vm.cancel = function () {
      vm.dismiss({$value: 'cancel'});
    };

    vm.submit = function (formData) {
      var action = vm.isNewRecord ? AdpDataService.createRecord : AdpDataService.updateRecord;

      return action(vm.link, formData, vm.id)
        .then(function (response) {
          if (response.data.success) {
            vm.close({$value: response.data});
          }
        });
    };
  }
})();
