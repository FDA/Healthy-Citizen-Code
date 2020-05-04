;(function () {
  'use strict';

  angular.module('app')
    .directive('adpFullscreen', adpFullscreen);

  function adpFullscreen(AdpFullscreenService) {
    return {
      restrict: 'EA',
      link: function (scope, element) {
        AdpFullscreenService.registerFullScreenElement(element[0]);

        scope.$on('$destroy', function () {
          AdpFullscreenService.unregisterFullScreenElement(element[0]);
        });
      }
    }
  }
})();
