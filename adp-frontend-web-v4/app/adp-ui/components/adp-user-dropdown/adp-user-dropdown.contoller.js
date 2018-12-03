;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .controller('adpUserDropdownController', adpUserDropdownController);

  /** @ngInject */
  function adpUserDropdownController(
    AdpSessionService,
    AdpModalService
  ) {
    var vm = this;
    vm.user = AdpSessionService.getUser();
    console.log(vm.user);

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
