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
    var authSettings = window.adpAppStore.appInterface().app.auth;
    var vm = this;

    vm.user = lsService.getUser();
    vm.isGuest = lsService.isGuest();
    vm.showLogin = lsService.isGuest() && authSettings.enableAuthentication;

    vm.logout = function () {
      if (vm.isGuest) {
        return;
      }

      var options = {
        message: 'Are you sure you want to logout?',
        actionType: 'confirm-logout'
      };

      AdpModalService.confirm(options)
        .then(AdpSessionService.logout);
    }
  }
})();
