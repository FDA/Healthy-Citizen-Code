;(function () {
  "use strict";

  angular
    .module('app.adpLayout')
    .controller('LayoutController', LayoutController);

  /** @ngInject */
  function LayoutController(
    AdpSessionService,
    AdpModalService,
    INTERFACE
  ) {
    var vm = this;
    vm.interface = INTERFACE;
    vm.header = INTERFACE.header;
    vm.footer = INTERFACE.footer;

    vm.logout = function () {
      var options = {
        message: 'Are you sure you want to logout?',
        actionType: 'confirm-logout'
      };

      AdpModalService.confirm(options)
        .then(AdpSessionService.logout);
    }
  }
})();