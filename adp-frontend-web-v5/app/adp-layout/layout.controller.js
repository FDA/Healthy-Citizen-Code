;(function () {
  "use strict";

  angular
    .module('app.adpLayout')
    .controller('LayoutController', LayoutController);

  /** @ngInject */
  function LayoutController($rootScope, AdpFullscreenService) {
    var INTERFACE = window.adpAppStore.appInterface();
    var vm = this;
    vm.interface = INTERFACE;
    vm.header = INTERFACE.app.header;
    vm.footer = INTERFACE.app.footer;
    vm.toggleFullScreen = function () {
      $rootScope.isFullscreen = !$rootScope.isFullscreen;
    };

    $rootScope.$watch(function () {
      return $rootScope.isFullscreen;
    }, function(fullscreenEnabled) {
      fullscreenEnabled ?
        AdpFullscreenService.requestFullscreen(document.documentElement) :
        AdpFullscreenService.exitFullscreen();
    });
  }
})();
