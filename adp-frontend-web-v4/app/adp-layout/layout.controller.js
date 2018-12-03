;(function () {
  "use strict";

  angular
    .module('app.adpLayout')
    .controller('LayoutController', LayoutController);

  /** @ngInject */
  function LayoutController() {
    var INTERFACE = window.adpAppStore.appInterface();
    var vm = this;
    vm.interface = INTERFACE;
    vm.header = INTERFACE.header;
    vm.footer = INTERFACE.footer;
  }
})();