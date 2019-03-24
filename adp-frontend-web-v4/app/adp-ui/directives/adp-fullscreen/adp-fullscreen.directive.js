;(function () {
  'use strict';

  angular.module('app')
    .directive('adpFullscreen', adpFullscreen);

  function adpFullscreen(AdpFullscreenService, $rootScope) {
    return {
      restrict: 'EA',
      link: function (scope, element) {
        scope.$watch(function () {
          return $rootScope.isFullscreen;
        }, onChange);

        function onChange(fullscreenEnabled) {
          fullscreenEnabled ?
            AdpFullscreenService.requestFullscreen(element[0]) :
            AdpFullscreenService.exitFullscreen();
        }
      }
    }
  }
})();