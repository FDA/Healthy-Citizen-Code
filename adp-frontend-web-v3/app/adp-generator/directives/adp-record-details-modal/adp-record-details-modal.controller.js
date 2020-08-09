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
      vm.itemData = vm.resolve.options.itemData;
    };

    vm.close = function () {
      vm.dismiss({$value: 'cancel'});
    };
  }
})();
