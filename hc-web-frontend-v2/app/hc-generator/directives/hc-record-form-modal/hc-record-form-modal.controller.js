;(function () {
  'use strict';

  angular
    .module('app.hcGenerator')
    .controller('HcRecordModalController', HcRecordModalController);

  /** @ngInject */
  function HcRecordModalController(HcDataService) {
    var vm = this;

    vm.$onInit = function () {
      vm.fields = vm.resolve.options.fields;
      vm.data = vm.resolve.options.data || {};
      vm.link = vm.resolve.options.link;

      vm.id = vm.data._id || null;
      vm.isNewRecord = vm.resolve.options['actionType'] === 'create';
      vm.action = vm.isNewRecord ? 'Add' : 'Update';
    };

    vm.cancel = function () {
      vm.dismiss({$value: 'cancel'});
    };

    vm.submit = function (formData) {
      var action = vm.isNewRecord ? HcDataService.createRecord : HcDataService.updateRecord;

      return action(vm.link, formData, vm.id)
        .then(function (response) {
          vm.close({$value: response.data});
        });
    };
  }
})();
