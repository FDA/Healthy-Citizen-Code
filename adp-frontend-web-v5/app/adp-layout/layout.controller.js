;(function () {
  "use strict";

  angular
    .module('app.adpLayout')
    .controller('LayoutController', LayoutController);

  /** @ngInject */
  function LayoutController($rootScope, AdpFullscreenService, APP_CONFIG) {
    var INTERFACE = window.adpAppStore.appInterface();
    var vm = this;
    vm.interface = INTERFACE;
    vm.header = INTERFACE.app.header;
    vm.footer = INTERFACE.app.footer;
    vm.toggleFullScreen = function () {
      $rootScope.isFullscreen = !$rootScope.isFullscreen;
    };

    vm.assetUrl = function (assetPath) {
      return !!APP_CONFIG.appSuffix ? '/' + APP_CONFIG.appSuffix + assetPath : assetPath;
    }

    $rootScope.$watch(function () {
      return $rootScope.isFullscreen;
    }, function(fullscreenEnabled) {
      fullscreenEnabled ?
        AdpFullscreenService.requestFullscreen(document.documentElement) :
        AdpFullscreenService.exitFullscreen();
    });
  }
})();
