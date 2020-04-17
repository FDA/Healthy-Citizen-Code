(function() {
  angular
    .module('app.adpForceGraph')
    .controller('OntologyController', function() {})
    .directive('adpFullscreenListener', adpFullScreenListener)
    .factory('AdpForceGraphHelpers', adpForceGraphHelpers);

  function adpForceGraphHelpers() {
    function linkSpeed(link) {
      // 0.01 is default speed, 0.2 is very maximum (===5frames to travel whole link len for one particle)
      // link.spd varies from 1 to 100, by schema config
      return (link.pspd || 5) / 500;
    }

    function fitGraphSize(graph, $container) {
      setTimeout(function() {
        graph.width($container.width());
        graph.height($container.height());
      }, 0);
    }

    return {
      linkSpeed: linkSpeed,
      fitGraphSize: fitGraphSize,
    };
  }

  function adpFullScreenListener(AdpFullscreenService, $rootScope) {
    return {
      restrict: 'A',
      link: function(scope) {
        document.addEventListener('fullscreenchange', onFullScreenChange);
        document.addEventListener('mozfullscreenchange', onFullScreenChange);
        document.addEventListener('webkitfullscreenchange', onFullScreenChange);
        document.addEventListener('msfullscreenchange', onFullScreenChange);

        function onFullScreenChange() {
          $rootScope.isFullscreen = AdpFullscreenService.fullscreenEnabled();
          scope.$apply();
        }
      },
    };
  }
})();
