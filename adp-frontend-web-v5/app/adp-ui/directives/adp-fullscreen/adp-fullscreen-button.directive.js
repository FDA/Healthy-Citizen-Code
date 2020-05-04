;(function () {
  'use strict';

  angular.module('app')
    .directive('adpFullscreenButton', adpFullscreenButton);

  function adpFullscreenButton(AdpBrowserService, $rootScope) {
    return {
      restrict: 'E',
      templateUrl: 'app/adp-ui/directives/adp-fullscreen/adp-fullscreen-button.html',
      link: function (scope) {
        scope.isFullscreenSupported = AdpBrowserService.isFullscreenSupported;

        scope.toggleFullScreen = function () {
          $rootScope.isFullscreen = !$rootScope.isFullscreen;
        };
      }
    }
  }
})();
