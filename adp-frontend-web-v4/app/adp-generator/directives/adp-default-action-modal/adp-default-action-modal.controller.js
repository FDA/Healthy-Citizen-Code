;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .controller('adpDefaultActionModalController', adpDefaultActionModalController);

  /** @ngInject */
  function adpDefaultActionModalController() {
    var vm = this;

    vm.$onInit = function () {
      vm.itemData = vm.resolve.options.itemData;
    };

    vm.close = function () {
      vm.dismiss({$value: 'cancel'});
    };
  }
})();
