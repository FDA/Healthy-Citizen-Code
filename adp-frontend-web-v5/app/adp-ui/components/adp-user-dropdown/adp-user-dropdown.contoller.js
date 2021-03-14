;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .controller('adpUserDropdownController', adpUserDropdownController);

  /** @ngInject */
  function adpUserDropdownController(
    AdpSessionService,
    AdpModalService,
    $rootScope,
    AdpFilePathService,
    APP_CONFIG
  ) {
    var authSettings = window.adpAppStore.appInterface().app.auth;
    var vm = this;

    vm.user = lsService.getUser();
    vm.isGuest = lsService.isGuest();
    vm.showLogin = lsService.isGuest() && authSettings.enableAuthentication;
    vm.avatarSrc = getAvatar($rootScope.avatar);
    vm.showClsCsrInUserMenu = APP_CONFIG.showClsCsrInUserMenu;

    $rootScope.$watch('avatar.id', function (newVal, oldVal) {
      if (newVal === oldVal) {
        return;
      }

      vm.avatarSrc = getAvatar($rootScope.avatar);
    });

    function getAvatar(fileItem) {
      if (_.isEmpty(fileItem)) {
        return 'assets/img/profile.jpg';
      }

      return fileItem.cropped ?
        AdpFilePathService.cropped(fileItem) :
        AdpFilePathService.thumb(fileItem);
    }

    vm.logout = function () {
      if (vm.isGuest) {
        return;
      }

      var options = {
        message: 'Are you sure you want to logout?',
        actionType: 'confirm-logout',
      };

      AdpModalService.confirm(options)
        .then(AdpSessionService.logout);
    }

    vm.resetUI = function () {
      var options = {
        message: 'This will reset your current frontend setting to default and logout you from the system. Are you sure you want to proceed?',
        actionType: 'confirm-ui-reset',
      };

      AdpModalService.confirm(options)
        .then(function () {
          lsService.clear();
          window.location.reload(true);
        });
    }
  }
})();
