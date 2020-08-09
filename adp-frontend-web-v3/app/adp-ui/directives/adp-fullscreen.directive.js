;(function () {
  'use strict';

  angular.module('app')
    .directive('adpFullscreen', adpFullscreen);

  function adpFullscreen(AdpFullscreenService) {
    return {
      restrict: 'EA',
      scope: {
        adpFullscreen: '='
      },
      link: function (scope, element) {
        var fsEvents = [
          'fullscreenchange',
          'webkitfullscreenchange',
          'mozfullscreenchange',
          'MSFullscreenChange'
        ].join(' ');
        scope.$watch('adpFullscreen', onChange);

        function onChange(fullscreenEnabled) {
          fullscreenEnabled ?
            AdpFullscreenService.requestFullscreen(element[0]) :
            AdpFullscreenService.exitFullscreen();
        }
      }
    }
  }
})();