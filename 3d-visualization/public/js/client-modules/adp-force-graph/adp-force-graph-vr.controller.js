(function() {
  angular.module('app.adpForceGraph').controller('ForceGraphControllerVr', forceGraphControllerVr);

  /** @ngInject */
  function forceGraphControllerVr(
    $scope,
    $http,
    $timeout,
    AdpNotificationService,
    AdpClientCommonHelper,
    AdpForceGraphHelpers,
    APP_CONFIG
  ) {
    var vm = this;
    var $container = null;
    var $box = null;
    var forceGraphVr;
    var relData = null;
    var proms = [];

    vm.isLoading = true;

    if (typeof ForceGraphVr === 'undefined') {
      proms.push(AdpClientCommonHelper.loadScript(APP_CONFIG.apiUrl + '/public/js/lib/force-graph/index.js'));

      AdpClientCommonHelper.loadCss(APP_CONFIG.apiUrl + '/public/js/lib/force-graph/css/style.css');
    }

    !relData &&
      proms.push(
        $http
          .get(APP_CONFIG.apiUrl + '/getFdaVipFgData')
          .then(function(res) {
            relData = _.pick(res.data, ['nodes', 'links']);
          })
          .catch(function() {
            vm.error_message = 'Data load error';
          })
      );

    $.when
      .apply(this, proms)
      .then(function() {
        vm.isLoading = false;
        relData && $timeout(doInitGraph, 0);
        $scope.$apply();
      })
      .catch(function(e) {
        AdpNotificationService.notifyError('Fatal while loading data: ' + e.message);
      });

    function fitSize() {
      AdpForceGraphHelpers.fitGraphSize(forceGraphVr, $container);
    }

    function doInitGraph() {
      $container = $('#fg3d-container');
      $box = $('#fg3d-box');

      forceGraphVr = ForceGraphVr()($box[0])
        .linkCurvature(0.3)
        .linkLabel('n')
        .nodeLabel('n')
        .linkWidth(function(link) {
          return link.w;
        })
        .linkColor(function(link) {
          return link.col;
        })
        .linkOpacity(0.5)
        .linkDirectionalParticles(function(link) {
          return link.trf || 0;
        })
        .linkDirectionalParticleWidth(function(link) {
          return link.pw || 0;
        })
        .linkDirectionalParticleColor(function(link) {
          return link.pcol || 'white';
        })
        .linkDirectionalArrowLength(4)
        .linkDirectionalArrowRelPos(0.5)
        .linkDirectionalParticleSpeed(AdpForceGraphHelpers.linkSpeed)
        .graphData(relData)
        .nodeThreeObject(nodeGeometryVr);

      forceGraphVr.d3Force('link').distance(linkDistanceVr);

      $(window).on('resize', fitSize);
      fitSize();
    }

    // Due AFrame underlying lib nature outer code is unreachable... need pure function only. sux..
    function nodeGeometryVr(node) {
      var size = node.size || 5;
      var creators = {
        Box: function(s) {
          return new Three.BoxGeometry(s, s, s);
        },
        Tetrahedron: function(s) {
          return new Three.TetrahedronGeometry(s);
        },
        Torus: function(s) {
          return new Three.TorusGeometry(s, s * 0.4, 6, 12);
        },
        Octahedron: function(s) {
          return new Three.OctahedronGeometry(s);
        },
        Cone: function(s) {
          return new Three.ConeGeometry(s * 0.5, s, 12);
        },
        TorusKnot: function(s) {
          return new Three.TorusKnotGeometry(s * 0.6, s * 0.2, 48, 6);
        },
        Sphere: function(s) {
          return new Three.SphereGeometry(s);
        },
      };
      var geomShape = creators[node.shp || 'Sphere'];

      if (geomShape) {
        var geometry = geomShape(size);
        var color = (node.col || 'white').toLowerCase();

        return new Three.Mesh(
          geometry,
          new Three.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.75,
          })
        );
      }
      return null;
    }

    function linkDistanceVr(link) {
      return link.dst || 30;
    }
  }
})();
