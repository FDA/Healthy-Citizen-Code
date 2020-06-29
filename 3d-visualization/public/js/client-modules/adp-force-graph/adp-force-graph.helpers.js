(function() {
  var DEFAULT_COLOR = 'white';

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

    function linkParticleColor(link) {
      return link.pcol || mixColors(link.col || DEFAULT_COLOR, 0, 0, 0.65);
    }

    function mixColors(col1, col2, mix, bright) {
      var col = Color(col1);
      var mixture = col.mix(Color(col2), _.isUndefined(mix) ? 0.5 : mix);
      var res, coof;

      if (_.isUndefined(bright) || bright === 0.5) {
        res = mixture;
      } else if (bright > 0.5) {
        coof = Math.min(1, bright - 0.5) * 2;
        res = mixture.hwb();
        res.color[1] += (100 - res.color[1]) * coof;
        res.color[2] -= res.color[2] * coof;
      } else {
        coof = Math.max(0, 0.5 - bright) * 2;
        res = mixture.hwb();
        res.color[1] -= res.color[1] * coof;
        res.color[2] += (100 - res.color[2]) * coof;
      }

      return res.hex();
    }

    return {
      linkSpeed: linkSpeed,
      fitGraphSize: fitGraphSize,
      linkParticleColor:linkParticleColor,
      mixColors:mixColors,
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
