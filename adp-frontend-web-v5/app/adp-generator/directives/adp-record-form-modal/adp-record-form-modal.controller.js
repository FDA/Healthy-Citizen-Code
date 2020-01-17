;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .controller('AdpRecordModalController', AdpRecordModalController);

  /** @ngInject */
  function AdpRecordModalController() {
    var vm = this;

    vm.$onInit = function () {
      vm.schema = vm.resolve.options.schema;
      vm.fields = vm.schema.fields;
      vm.formParams = vm.resolve.options.formParams;
      vm.data = vm.resolve.options.data;
      vm.actionCb = vm.resolve.options.actionCb;
    };

    vm.cancel = function () {
      vm.dismiss({$value: 'cancel'});
    };

    vm.submit = function (formData) {
      return vm.actionCb(vm.schema, formData)
        .then(function () {
          // must explicitly return
          return vm.close();
        });
    };
  }
})();
