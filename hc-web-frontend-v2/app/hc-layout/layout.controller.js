;(function () {
  "use strict";

  angular
    .module('app.hcLayout')
    .controller('LayoutController', LayoutController);

  /** @ngInject */
  function LayoutController(
    HcSessionService,
    HcModalService,
    INTERFACE
  ) {
    var vm = this;
    vm.interface = INTERFACE;
    vm.header = INTERFACE.header;
    vm.footer = INTERFACE.footer;

    vm.logout = function () {
      var options = {
        message: 'Are you sure you want to logout?'
      };

      HcModalService.confirm(options)
        .then(HcSessionService.logout);
    }
  }
})();