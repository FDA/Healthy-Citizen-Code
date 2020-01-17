;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .controller('AdpRecordDetailsModalController', AdpRecordDetailsModalController);

  /** @ngInject */
  function AdpRecordDetailsModalController() {
    var vm = this;

    vm.$onInit = function () {
      vm.schema = vm.resolve.options.schema;
      vm.data = vm.resolve.options.data;
    };

    vm.close = function () {
      vm.dismiss({$value: 'cancel'});
    };
  }
})();
