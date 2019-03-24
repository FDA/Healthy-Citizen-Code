;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .controller('AdpRecordModalController', AdpRecordModalController);

  /** @ngInject */
  function AdpRecordModalController(AdpDataService) {
    var vm = this;

    vm.$onInit = function () {
      vm.schema = vm.resolve.options.schema;
      vm.fields = vm.resolve.options.fields;
      vm.formParams = vm.resolve.options.formParams;
      vm.data = vm.resolve.options.data || {};
      vm.link = vm.resolve.options.link;

      var $action = vm.formParams.actionType;

      vm.isNewRecord = $action === 'create' || $action === 'clone';
      vm.btnText = vm.isNewRecord ? 'Add' : 'Update';
    };

    vm.cancel = function () {
      vm.dismiss({$value: 'cancel'});
    };

    vm.submit = function (formData) {
      var action = vm.isNewRecord ? AdpDataService.createRecord : AdpDataService.updateRecord;

      return action(vm.link, formData)
        .then(function (response) {
          if (response.data.success) {
            vm.close({$value: response.data});
          }
        });
    };
  }
})();
