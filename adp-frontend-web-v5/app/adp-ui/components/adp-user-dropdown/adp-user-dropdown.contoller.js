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
    $http,
    APP_CONFIG,
    AdpMediaTypeHelper
  ) {
    var authSettings = window.adpAppStore.appInterface().app.auth;
    var vm = this;
    var DEFAULT_AVATAR = APP_CONFIG.appSuffix + '/assets/img/profile.jpg';

    vm.user = lsService.getUser();
    vm.isGuest = lsService.isGuest();
    vm.showLogin = lsService.isGuest() && authSettings.enableAuthentication;
    vm.avatarSrc = DEFAULT_AVATAR;

    getAvatar($rootScope.avatar)
      .then(function (src) {
        vm.avatarSrc = src;
      });

    vm.showClsCsrInUserMenu = APP_CONFIG.showClsCsrInUserMenu;

    $rootScope.$watch('avatar.id', function (newVal, oldVal) {
      if (newVal === oldVal) {
        return;
      }

      getAvatar($rootScope.avatar)
        .then(function (src) {
          vm.avatarSrc = src;
        });
    });

    function getAvatar(fileItem) {
      if (_.isEmpty(fileItem)) {
        return Promise.resolve(DEFAULT_AVATAR);
      }

      var fnName = fileItem.cropped ? 'getCroppedImgLink' : 'getThumbImgLink';
      return AdpMediaTypeHelper[fnName](fileItem);
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
