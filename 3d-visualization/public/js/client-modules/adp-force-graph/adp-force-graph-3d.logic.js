(function () {
  var SELECTION_LINK_WIDTH = 2;
  var DEFAULT_NODE_SIZE = 5;
  var DEFAULT_LINK_LABEL_SIZE = 5;
  var DEFAULT_NODE_SHAPE = 'Sphere';
  var DEFAULT_COLOR = 'white';
  var HIGHLIGHT_COLOR = 'magenta';
  var FILTERED_COLOR = 'coral';
  var SELECTED_COLOR = 'orangered';
  var LINK_MAX_CURVATURE = 1;
  var LINK_OPACITY = 0.5;
  var DEFAULT_LINK_DISTANCE = 100;
  var NODE_COMMON_OPACITY = 0.95;
  var MAX_LABEL_LENGTH = 10; // Chars
  var CAMERA_ANIMATION_INTERVAL = 30; // Update camera pos every XXX mills, > 0 !!
  var TAP_SPEED = 500; // Max time for screen touch to be considered as 'tap'
  var CAMERA_FLY_INTERVAL = 500; // Time to move camera on buttons navigation

  var geometryCreators = {
    Box: function (size) {
      return new Three.BoxGeometry(size, size, size);
    },
    Tetrahedron: function (size) {
      return new Three.TetrahedronGeometry(size);
    },
    Torus: function (size) {
      return new Three.TorusGeometry(size, size * 0.4, 6, 12);
    },
    Octahedron: function (size) {
      return new Three.OctahedronGeometry(size);
    },
    Cone: function (size) {
      return new Three.ConeGeometry(size * 0.5, size, 12);
    },
    TorusKnot: function (size) {
      return new Three.TorusKnotGeometry(size * 0.6, size * 0.2, 48, 6);
    },
    Sphere: function (size) {
      return new Three.SphereGeometry(size, 16, 12);
    },
  };

  angular.module('app.adpForceGraph').factory('ForceGraphControllerLogic', forceGraphControllerLogic);

  /** @ngInject */
  function forceGraphControllerLogic() {
    return function (
      onInterfaceUpdate,
      $scope,
      $rootScope,
      $interval,
      $timeout,
      $http,
      $sce,
      $document,
      AdpNotificationService,
      AdpClientCommonHelper,
      AdpForceGraphHelpers,
      AdpFullscreenService,
      APP_CONFIG,
      tagBoxCreator,
      doLoadData,
      doLoadConfig,
      visualisationSetup
    ) {
      var vm = this;
      var forceGraph;
      var graphData = null;
      var proms = [];
      var $container = $('#fg3d-container');
      var $box = $('#fg3d-box');
      var orbitInterval = null;
      var camOrbiter = null;
      var tagsFilterInstance = null;
      var canvasInFocus = false;
      var touchData = {};
      var scrollbars = {};
      var nothingIsMarked = true;
      var selectiveGlowPass;
      var keysConf = [
        {key: 'r', attr: 'labelLinks'},
        {key: 'e', attr: 'labelNodes'},
        {key: 'o', attr: 'animCamera', action: 'toggleCameraOrbit'},
        {key: 'm', attr: 'showOptions'},
        {key: 'd', attr: 'showLegend'},
        {key: 'x', attr: 'fixDragged', action: 'resetFixDragged'},
        {key: 'f', action: 'toggleFullscreen'},
        {
          key: '+',
          action: function () {
            changeLinksDistance(1.1);
          },
        },
        {
          key: '-',
          action: function () {
            changeLinksDistance(0.9);
          },
        },
        {key: 's', action: 'saveConfig'},
        {key: 'l', action: 'loadConfig'},
      ];
      var configFieldsLimits = {
        hlColorize: {min: 0, max: 100},
        hlGlow: {min: 0, max: 100},
        hlBrightness: {min: 0, max: 100},
        hlDim: {min: 0, max: 100},
        linkCurvature: {min: 0, max: 100},
        linkDistance: {min: 1},
        particleSize: {
          min: 1, max: 10,
          onChange:
            function (val, vm) {
              if (val === '0') {
                vm.config.showParticles = false;
              }
            }
        },
        arrowSize: {
          min: 1, max: 10,
          onChange:
            function (val, vm) {
              if (val === '0') {
                vm.config.showArrows = false;
              }
            }
        },
      };

      if (APP_CONFIG.ALLOW_PERFORMANCE_MONITOR === 'true') {
        vm.performanceMonitor = {
          show: false,
          run: false,
          toggle: function () {
            if (vm.performanceMonitor.show && !vm.performanceMonitor.run) {
              renderStats();
            }
          }
        };
      }

      vm.apiUrl = APP_CONFIG.apiUrl;
      vm.isLoading = true;
      vm.cachedConfig = null;
      vm.selectedNodes = [];
      vm.config = {
        showOptions: false,
        showLegend: false,
        hlLabelNodes: false,
        hlLabelLinks: false,
        hlColorize: 50,
        hlBrightness: 75,
        hlGlow: 50,
        hlDim: 50,
        labelLinks: false,
        labelNodes: false,
        showArrows: true,
        arrowSize: 4,
        showParticles: true,
        particleSize: 1,
        animCamera: false,
        fixDragged: false,
        linkCurvature: (LINK_MAX_CURVATURE * 100) / 2,
        linkDistance: DEFAULT_LINK_DISTANCE,
        nodeFilter: '',
        linkFilter: '',
        tagsFilter: [],
        highlightAdjacent: false,
      };

      if (typeof ForceGraph === 'undefined') {
        var jsCodePath = APP_CONFIG.serverBaseUrl + APP_CONFIG.resourcePrefix + '/public/js/lib/force-graph/index.js';
        var cssStylesPath = APP_CONFIG.serverBaseUrl + APP_CONFIG.resourcePrefix + '/public/js/lib/force-graph/css/style.css?v1';

        // This polyfill is to fix pure WebXR support in Chrome 79
        if (navigator && navigator.xr && !_.isFunction(navigator.xr.requestDevice)) {
          navigator.xr.requestDevice = function () {
            return new $.Deferred().resolve(null);
          };
        }
        proms.push(
          AdpClientCommonHelper.loadScript(jsCodePath)
            .then(initScrollbars)
        );
        AdpClientCommonHelper.loadCss(cssStylesPath);
      } else {
        initScrollbars();
      }

      if (!graphData) {
        proms.push(
          doLoadData()
            .then(
              function (data) {
                graphData = _.pick(data, ['nodes', 'links']);
                vm.selectedNodes = getPreselectedSubjects(graphData);
                vm.legend = data.legend;
                vm.tags = data.tags;
              })
            .catch(function (error) {
              vm.error_message = 'Data load error';
              console.error(error)
            })
        );
      }

      proms.push(
        getConfig()
          .then(function (conf) {
            applyConfig(conf, true);
          })
          .catch(function (e) {
            handleHttpError(e, 'Config load error');
          })
      );

      Promise.all(proms)
        .then(function () {
          if (graphData && graphData.nodes) {
            $timeout(
              function () {
                vm.isLoading = false;
                doInitGraph();
              }, 0);
          }
          $document.on('keypress', onKeyPress);
        })
        .catch(function (e) {
          handleError(e, 'Error while loading code and data');
        });

      /* Methods, available from page interface, is put into vm.### */

      vm.doRefreshGraph = doRefreshGraph;

      vm.toggleConfig = function () {
        vm.config.showOptions = !vm.config.showOptions;
      };

      vm.toggleLegend = function (event, force) {
        if (_.isBoolean(force)) {
          vm.config.showLegend = force;
        } else {
          vm.config.showLegend = !vm.config.showLegend;
        }

        scrollbars.config && scrollbars.config.recalculate();
        scrollbars.legend && scrollbars.legend.recalculate();

        event.stopPropagation();
      };

      vm.toggleFullscreen = function () {
        $rootScope.isFullscreen = !$rootScope.isFullscreen;
      };

      vm.reheatSimulation = function () {
        forceGraph.numDimensions(3);
      };

      vm.resetFixDragged = function () {
        if (!vm.config.fixDragged) {
          _.each(graphData.nodes, function (node) {
            node.fx = node.fz = node.fy = undefined;
          });
        }
        doRefreshGraph();
      };

      vm.toggleCameraOrbit = function () {
        var camera = forceGraph.camera();

        forceGraph
          .enableNodeDrag(!vm.config.animCamera);

        orbitInterval && $interval.cancel(orbitInterval);
        orbitInterval = null;

        if (vm.config.animCamera) {
          var data = sightOnCenter();

          camOrbiter = new OrbitControls(camera, $box[0]);
          camOrbiter.autoRotateSpeed = 5; // default is 2.0
          camOrbiter.target = data.lookAtPoint;

          $timeout(function () {
            camOrbiter.autoRotate = true;
          }, CAMERA_FLY_INTERVAL);

          orbitInterval = $interval(cameraOrbitAnimation, CAMERA_ANIMATION_INTERVAL);
        } else {
          if (camOrbiter) {
            camOrbiter.dispose();
            camOrbiter = null;
          }
        }
      };

      vm.saveConfig = function () {
        vm.cachedConfig = Object.assign({}, vm.config);

        doSaveConfig();
      };

      vm.loadConfig = function () {
        getConfig()
          .then(function (conf) {
            AdpNotificationService.notifySuccess('Config is restored');

            applyConfig(conf);
          })
      };

      vm.screenCapture = function () {
        if (vm.exportingImage) {
          return;
        }

        var renderer;
        var sx = forceGraph.width();
        var sy = forceGraph.height();
        var originalRatio = sx / sy;

        vm.exportingImage = true;

        try {
          renderer = new Three.WebGLRenderer({preserveDrawingBuffer: true});
          var gl = renderer.getContext();

          // Calculating maximum screen shot dimensions available.
          var maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
          var maxViewportDimensions = gl.getParameter(gl.MAX_VIEWPORT_DIMS);

          // 2000 is practically discovered constant which is very close to a limit.  2048 is already too much!
          // However, for IE11 it should be less as 'out-of-memory' error throw is common for microsoft beast...
          var zoomFactor = renderer.domElement.msToBlob ? 1000 : 2000;
          var maximumFactor = Math.sqrt((maxRenderBufferSize * zoomFactor) / (sx * sy));
          sx *= maximumFactor;
          sy *= maximumFactor;

          if (sx > maxViewportDimensions[0]) {
            sx = maxViewportDimensions[0];
            sy = sx / originalRatio;
          }

          if (sy > maxViewportDimensions[1]) {
            sy = maxViewportDimensions[1];
            sx = sy * originalRatio;
          }

          renderer.setSize(sx, sy);

          var composer = new window.EffectComposer(renderer);
          var scene = forceGraph.scene();
          var camera = forceGraph.camera();

          var selectiveGlowPass = new window.SelectiveGlowPass(scene, camera, renderer);

          updateBloomPass(extractBloomPass(selectiveGlowPass));

          var sceneRenderPass = new window.RenderPass(scene, camera);
          sceneRenderPass.renderToScreen = false;
          selectiveGlowPass.renderToScreen = false;

          composer.addPass(sceneRenderPass);
          composer.addPass(selectiveGlowPass);

          composer.render();

          if (renderer.domElement.msToBlob) {
            //for IE
            var blob = renderer.domElement.msToBlob();

            getFile(blob);
          } else {
            renderer.domElement.toBlob(getFile);
          }
        } catch(error) {
          handleError(error + '. Reload page and try again.', 'Export to PNG failed' );

          finalizeExport();
        }

        function getFile(blob) {
          if (blob) {
            downloadFile({blob: blob, fileName: genExportFileName('png'), mimeType: 'image/png'});
          } else {
            handleError('Seems like not enough memory', 'Export to PNG failed');
          }

          finalizeExport();
        }

        function finalizeExport(){
          vm.exportingImage = false;
          renderer.dispose();
        }
      };

      vm.exportAsHtml = function () {
        vm.exportingHtml = true;
        $.when
          .apply(this, [
            $http.get(APP_CONFIG.serverBaseUrl + APP_CONFIG.apiPrefix + '/public/js/lib/force-graph/export-template.html'),
            doLoadData()
          ])
          .then(function (res1, graphRawData) {
            var templateBody = res1.data;

            templateBody = templateBody
              .replace(/(window[.\w\s=]+)['"]__fg_data__['"]/, '$1' + JSON.stringify(graphRawData))
              .replace(
                /(window[.\w\s=]+)['"]__fg_config__['"]/,
                '$1' + JSON.stringify(Object.assign({}, vm.config, {showOptions: false}))
              );

            downloadFile({
              mimeType: 'text/html',
              fileName: genExportFileName('html'),
              buffer: templateBody,
            });
          })
          .catch(function (e) {
            handleHttpError(e, 'Error while loading export template');
          })
          .always(function () {
            vm.exportingHtml = false;
          });
      };

      vm.trustedHtml = function (plainText) {
        return $sce.trustAsHtml(plainText);
      }

      vm.navigationZoomIn = function () {
        moveCameraAlongDirection(true);
      };

      vm.navigationZoomOut = function () {
        moveCameraAlongDirection(false);
      };

      vm.navigationCenter = function () {
        sightOnCenter();
      };

      vm.getTagNamesByIds = function (tagIds) {
        return _.join(
          _.reduce(vm.tags, function (stack, item) {
            if (tagIds.indexOf(item.id) >= 0) {
              stack.push(item.text);
            }
            return stack;
          }, []), ', ');
      }

      function moveCameraAlongDirection(zoomIn) {
        var camera = forceGraph.camera();
        var controller = forceGraph.controls();
        var orbitRadius = camera.position.clone().sub(controller.target).length();
        var factor = Math.pow(0.75, controller.zoomSpeed)
        var currentDirection = new Three.Vector3();
        var moveDistance;

        if (zoomIn) {
          moveDistance = orbitRadius - orbitRadius * factor;
        } else {
          moveDistance = orbitRadius - orbitRadius / factor;
        }

        if (orbitRadius + moveDistance < controller.minDistance ||
          orbitRadius + moveDistance > controller.maxDistance) {
          return;
        }

        camera.getWorldDirection(currentDirection);
        currentDirection.normalize();

        var newPosition = camera.position.clone()
          .addScaledVector(currentDirection, moveDistance);

        forceGraph.cameraPosition(newPosition, controller.target, CAMERA_FLY_INTERVAL);
      }

      function sightOnCenter() {
        var camera = forceGraph.camera();
        var attention = getAttentionNodes();
        var lookAtPoint = attention.lookAtPoint;
        var boundingSphereRadius = attention.radius;
        var lookAtNewDirection = new Three.Vector3()
          .subVectors(lookAtPoint, camera.position)
          .normalize();
        var newCameraPosition = lookAtPoint.clone()
          .addScaledVector(lookAtNewDirection, -3 * boundingSphereRadius);

        forceGraph.cameraPosition(newCameraPosition, lookAtPoint, CAMERA_FLY_INTERVAL);

        return {
          lookAtPoint: lookAtPoint,
          cameraPosition: newCameraPosition
        }
      }

      function getAttentionNodes() {
        var lookAtPoint = new Three.Vector3();
        var nodes = graphData.nodes;
        var radius = 0;

        if (vm.selectedNodes.length || vm.config.nodeFilter || vm.config.linkFilter) {
          var nodesToCheck = nodes;
          nodes = [];

          if (vm.selectedNodes.length) {
            nodesToCheck = vm.selectedNodes;
          }

          var counter = 0;

          _.each(nodesToCheck, function (obj) {
            if (
              (isNode(obj) && (!vm.config.nodeFilter || isNodeFiltered(obj))) ||
              (isLink(obj) && (!vm.config.linkFilter || isLinkFiltered(obj)))
            ) {
              nodes.push(obj);

              _.each(pickNodePoints(obj), function (p) {
                lookAtPoint.add(p);
                counter++;
              })
            }
          });

          counter && lookAtPoint.divideScalar(counter);
        }

        _.each(nodes, function (obj) {
          var distance = Math.max.apply(this, _.map(pickNodePoints(obj), function (p) {
            return pointsDistance(p, lookAtPoint)
          }))

          if (distance > radius) {
            radius = distance;
          }
        });

        return {
          radius: Math.max(70, radius),
          lookAtPoint: lookAtPoint
        };
      }

      function pickNodePoints(obj) {
        if (isNode(obj)) {
          return obj.__threeObj ? [obj.__threeObj.position] : [];
        } else if (isLink(obj)) {
          return obj.source.__threeObj ? [
            obj.source.__threeObj.position,
            obj.target.__threeObj.position
          ] : [];
        } else {
          return [];
        }
      }

      function pointsDistance(a, b) {
        return a.distanceTo(b);
      }

      function initScrollbars() {
        scrollbars.config = new SimpleBar($('#fg3d-config-form', $container)[0]);
        scrollbars.legend = new SimpleBar($('#fg3d-legend-box', $container)[0]);
        scrollbars.infobox = new SimpleBar($('#fg3d-info-box', $container)[0]);
      }

      function doInitGraph() {
        var $tagBox = $('.fg3d-tags-container');

        forceGraph = new ForceGraph();

        forceGraph($box[0])
          .backgroundColor('#000000')
          .onNodeClick(function (node, e) {
            onGraphClick(e, node);
          })
          .onLinkClick(function (link, e) {
            onGraphClick(e, link);
          })
          .linkOpacity(LINK_OPACITY)
          .linkDirectionalParticleColor(AdpForceGraphHelpers.linkParticleColor)
          .linkDirectionalParticleResolution(8)
          .linkDirectionalArrowRelPos(0.7)
          .linkDirectionalParticleSpeed(AdpForceGraphHelpers.linkSpeed)
          .onBackgroundClick(function (e) {
            onGraphClick(e);
          })
          .showNavInfo(false)
          .onNodeHover(onNodeHover)
          .onNodeDragEnd(onNodeDragEnd)
          .nodeThreeObject(nodeGeometry)
          .linkWidth(linkWidth)
          .linkMaterial(linkMaterial)
          .linkDirectionalArrowColor(linkArrowColor)
          .linkCurvature(linkCurvature)
          .linkCurveRotation(linkCurveRotation)
          .graphData(graphData);

        forceGraph.d3Force('link').distance(linkDistance);

        setTimeout(doRefreshGraph, 0);
        vm.toggleCameraOrbit();

        $(window).on('resize', fitSize);
        $box.on('touchstart', onTouchStart);
        $box.on('touchend', onTouchEnd);
        $box.on('mouseenter', onCanvasMouseEnter);
        $box.on('mouseleave', onCanvasMouseLeave);

        if ($scope) {
          // this code should work only in Angular version, not standalone (exported)
          AdpFullscreenService.registerFullScreenElement($container[0]);

          if ($rootScope.isFullscreen) {
            AdpFullscreenService.forceFullscreen($container[0]);
          }

          $scope.$on('$destroy', function () {
            AdpFullscreenService.unregisterFullScreenElement($container[0]);
          });
        }

        if ($tagBox.length) {
          tagBoxCreator($tagBox, {
            dataSource: _.map(vm.tags, function (item) {
              return item.text;
            }),
            value: getInitialLayersSelection(),
            maxDisplayedTags: 1,
            showSelectionControls: true,
            cssClass: 'fg3d-tags-control',
            onValueChanged: function (e) {
              vm.config.tagsFilter = _.map(e.value, function (tag) {
                return _.find(vm.tags, ['text', tag]).id;
              });
              vm.doRefreshGraph();
            },
            onOpened: function (e) {
              if (e.component._$list) {
                e.component._$list.addClass('fg3d-tags-control');
                e.component._$list.closest('.dx-overlay-content').css('overflow', 'visible');

                var overlayWrapper = e.component._$list.closest('.dx-overlay-wrapper');

                if (overlayWrapper.length) {
                  overlayWrapper.appendTo(e.element).css({
                    left: 0,
                    top: 0,
                    transform: 'none',
                  });
                }
              }
            },
            onInitialized: function (e) {
              tagsFilterInstance = e.component;
            },
          });
        }

        if (APP_CONFIG.ALLOW_PERFORMANCE_MONITOR === 'true') {
          vm.performanceMonitor.component = createStats();
          $('#fg3d-performance-monitor').append(vm.performanceMonitor.component.domElement);
          renderStats();
        }

        fitSize();

        selectiveGlowPass = new window.SelectiveGlowPass(forceGraph.scene(), forceGraph.camera(), forceGraph.renderer());

        refreshGlowParams();
      }

      function doRefreshGraph() {
        var showLinkLabels = vm.config.labelLinks || vm.config.hlLabelLinks;

        doCheckConfigFields();
        updateNodesState();

        nothingIsMarked =
          !vm.config.nodeFilter &&
          !vm.config.linkFilter &&
          !vm.selectedNodes.length &&
          !vm.config.tagsFilter.length;

        forceGraph
          .linkThreeObjectExtend(showLinkLabels)
          .linkThreeObject(showLinkLabels ? linkSprite : undefined)
          .linkPositionUpdate(showLinkLabels ? linkCustomPositionUpdate : undefined)
          .linkDirectionalArrowLength(vm.config.showArrows ? vm.config.arrowSize * 4 : 0)
          .linkDirectionalParticleWidth(vm.config.showParticles ? linkParticleSize : 0)
          .linkDirectionalParticles(vm.config.showParticles ?
            function (link) {
              return link.trf || 0;
            } : 0)

        onInterfaceUpdate && onInterfaceUpdate(vm);

        refreshGlowParams();

        forceGraph.refresh();
      }

      function createStats() {
        if (APP_CONFIG.ALLOW_PERFORMANCE_MONITOR === 'true') {
          var stats = new window.Stats;
          stats.setMode(0);

          stats.domElement.style.position = 'absolute';
          stats.domElement.style.right =
            stats.domElement.style.bottom = '0';
          stats.domElement.style.left =
            stats.domElement.style.top = 'auto';

          return stats;
        }
      }

      function renderStats() {
        if (APP_CONFIG.ALLOW_PERFORMANCE_MONITOR === 'true') {
          if (vm.performanceMonitor.show) {
            requestAnimationFrame(renderStats);
            vm.performanceMonitor.component.update();
          }

          vm.performanceMonitor.run = vm.performanceMonitor.show;
        }
      }

      function refreshGlowParams() {
        if (!selectiveGlowPass) {
          return
        }

        if (vm.config.hlGlow > 0 && !nothingIsMarked) {
          var currentPasses = forceGraph.postProcessingComposer().passes;

          if (currentPasses.length === 1) {
            forceGraph.postProcessingComposer().addPass(selectiveGlowPass);
          }

          updateBloomPass(extractBloomPass(selectiveGlowPass));

        } else {
          forceGraph.postProcessingComposer().passes.splice(1);
          forceGraph.postProcessingComposer().passes[0].renderToScreen = true;
        }
      }

      function extractBloomPass(selectiveGlowPass) {
        return _.get(selectiveGlowPass, 'bloomComposer.passes.1');
      }

      function updateBloomPass(bloomPass) {
        if (bloomPass) {
          bloomPass.threshold = 0.01;
          bloomPass.strength = vm.config.hlGlow / 12;
          bloomPass.radius = vm.config.hlGlow / 40;
        }
      }

      function doCheckConfigFields() {
        _.each(configFieldsLimits, function (obj, field) {
          if (obj.onChange) {
            obj.onChange(vm.config[field], vm);
          }
          if (!_.isUndefined(obj.min) && vm.config[field] < obj.min) {
            vm.config[field] = obj.min;
          }
          if (!_.isUndefined(obj.max) && vm.config[field] > obj.max) {
            vm.config[field] = obj.max;
          }
        });
      }

      function fitSize() {
        AdpForceGraphHelpers.fitGraphSize(forceGraph, $container);
      }

      function onGraphClick(e, item) {
        if (e.shiftKey && item) {
          if (item.isSelected) {
            vm.selectedNodes.splice(vm.selectedNodes.indexOf(item), 1);
          } else {
            vm.selectedNodes.push(item);
          }
          item.isSelected = !item.isSelected;
        } else {
          if (vm.selectedNodes.length) {
            _.each(vm.selectedNodes, function (obj) {
              obj.isSelected = false;
            });
          }
          if (item) {
            vm.selectedNodes = [item];
            item.isSelected = true;
          } else {
            vm.selectedNodes = [];
          }
        }

        doRefreshGraph();
      }

      function updateNodesState() {
        _.each(graphData.nodes, function (node) {
          node.isFiltered = isNodeFiltered(node) || isFilteredByTags(node);
          node.isLit = false;
        });

        _.each(graphData.links, function (link) {
          link.isFiltered = isLinkFiltered(link) || isFilteredByTags(link);

          var toFiltered = link.source.isFiltered || link.target.isFiltered || link.isFiltered;
          var toSelected = link.source.isSelected || link.target.isSelected || link.isSelected;

          if (vm.config.highlightAdjacent && (toFiltered || toSelected)
            || (!vm.config.highlightAdjacent && toSelected)) {
            link.isLit = !link.isFiltered;
            link.source.isLit = !link.source.isFiltered;
            link.target.isLit = !link.target.isFiltered;
          } else {
            link.isLit = false;
          }
        });
      }

      function onKeyPress(e) {
        if (!canvasInFocus) {
          return;
        }

        _.each(keysConf, function (one) {
          if (e.keyCode === one.keyCode || e.key.toLowerCase() === one.key) {
            if (one.attr) {
              vm.config[one.attr] = !vm.config[one.attr];
            }

            if (_.isFunction(one.action)) {
              one.action();
            } else if (_.isFunction(vm[one.action])) {
              vm[one.action]();
            }

            e.stopPropagation();

            doRefreshGraph();
          }
        });
      }

      function onTouchStart(e) {
        var touch = e.originalEvent.touches[0];

        if (touch) {
          touchData = {
            startTime: new Date(),
            x: touch.pageX,
            y: touch.pageY,
          };
        }
      }

      function onTouchEnd(e) {
        if (new Date() - touchData.startTime <= TAP_SPEED) {
          var offset = $box.offset();
          var raycaster = new Three.Raycaster();
          var camera = forceGraph.camera();
          var tapCoords = {
            x: ((touchData.x - offset.left) / forceGraph.width()) * 2 - 1,
            y: -((touchData.y - offset.top) / forceGraph.height()) * 2 + 1,
          };

          raycaster.camera = camera; // Required to keep raycaster stable
          raycaster.linePrecision = 1; // Lib's default
          raycaster.setFromCamera(tapCoords, camera);

          var intersects = _.find(raycaster.intersectObjects(forceGraph.scene().children, true), function (_ref) {
            return !!_ref.object.__graphObjType;
          });

          onGraphClick(e, intersects ? intersects.object.__data : null);
        }
      }

      function onCanvasMouseEnter() {
        canvasInFocus = true;
      }

      function onCanvasMouseLeave() {
        canvasInFocus = false;
      }

      function cameraOrbitAnimation() {
        camOrbiter && camOrbiter.update();
      }

      function getInitialLayersSelection() {
        return vm.config.tagsFilter.length ? getTagsByFilterValue(vm.config.tagsFilter) : [];
      }

      function getTagsByFilterValue(value) {
        return _.map(
          _.filter(vm.tags, function (tag) {
            return value.indexOf(tag.id) >= 0;
          }),
          function (item) {
            return item.text;
          }
        );
      }

      function getLambertMaterial(color, opacity) {
        return new Three.MeshLambertMaterial({
          color: Color(color).hex(),
          transparent: true,
          opacity: opacity,
        });
      }

      function getLineBasicMaterial(color, opacity) {
        return new Three.LineBasicMaterial({
          color: Color(color).hex(),
          transparent: true,
          opacity: opacity,
        });
      }

      function nodeGeometry(node) {
        var geometry = geometryCreator(node);

        if (!geometry) {
          return null;
        }

        var isMarked = node.isLit || node.isFiltered || node.isSelected;
        var mesh;
        var color;

        if (isMarked) {
          var colorizeColor = vm.config.highlightAdjacent ? SELECTED_COLOR :
            node.isSelected ? SELECTED_COLOR : node.isLit ? HIGHLIGHT_COLOR : node.isFiltered ? FILTERED_COLOR : 'white';
          var brightness = vm.config.hlBrightness / 100;

          color = AdpForceGraphHelpers.mixColors(node.col, colorizeColor, vm.config.hlColorize / 100, brightness);
        } else {
          color = (node.col || DEFAULT_COLOR).toLowerCase();
        }

        var opacity =
          isMarked || nothingIsMarked ? NODE_COMMON_OPACITY : NODE_COMMON_OPACITY * (1 - vm.config.hlDim / 100);

        var material = getLambertMaterial(color, opacity);

        node.isGlow = isMarked;
        geometry.renderOrder = 10;
        mesh = new Three.Mesh(geometry, material);
        mesh.renderOrder = 10;

        // Adding text sprite with label in few cases
        var showNodeLabel = node.l &&
          (vm.config.labelNodes ||
            (vm.config.hlLabelNodes && isMarked)
          );

        if (showNodeLabel) {
          var size = node.size || DEFAULT_NODE_SIZE;
          var labelText = shortLabelText(node.l, MAX_LABEL_LENGTH);
          var sprite = new SpriteText(labelText);

          sprite.color = AdpForceGraphHelpers.mixColors(color, 'white');
          sprite.textHeight = size;
          sprite.position.x = size;
          sprite.position.y = size;
          sprite.material.opacity = opacity;
          sprite.material.depthWrite = false;
          sprite.renderOrder = 10;

          mesh.add(sprite);
        }

        return mesh;
      }

      function linkSprite(link) {
        if (!link.n) {
          return null;
        }

        var isMarked = link.isLit || link.isFiltered || link.isSelected;
        var showLinkLabel = vm.config.labelLinks || (vm.config.hlLabelLinks && isMarked);

        if (!showLinkLabel) {
          return null;
        }

        var labelText = shortLabelText(link.n, MAX_LABEL_LENGTH);
        var sprite = new SpriteText(labelText);
        var linkOpacity =
          (nothingIsMarked || isMarked) ? 1 : ((100 - vm.config.hlDim) / 100)

        sprite.color = AdpForceGraphHelpers.mixColors(link.col, 'white')
        sprite.material.opacity = linkOpacity;

        sprite.textHeight = link.fsize || DEFAULT_LINK_LABEL_SIZE;

        return sprite;
      }

      function linkCustomPositionUpdate(sprite, p, link) {
        if (!sprite) {
          return;
        }

        var mid = link.__curve.v1;
        var midWeight = 1.3;
        var midPos = {
          x: (p.start.x + p.end.x + mid.x * midWeight) / 3,
          y: (p.start.y + p.end.y + mid.y * midWeight) / 3,
          z: (p.start.z + p.end.z + mid.z * midWeight) / 3,
        };

        Object.assign(sprite.position, midPos);
      }

      function linkCurvature(link) {
        return ((_.isUndefined(link.curv) ? vm.config.linkCurvature : link.curv) * LINK_MAX_CURVATURE) / 100;
      }

      function linkWidth(link) {
        return link.w || (link.isSelected ? SELECTION_LINK_WIDTH : 0);
      }

      function linkColor(link) {
        var colorizeColor;
        var brightness = vm.config.hlBrightness / 100;
        var linkColor;

        if (link.isSelected || (vm.config.highlightAdjacent && (link.isFiltered || link.isLit))) {
          colorizeColor = SELECTED_COLOR;
        } else if (link.isFiltered) {
          colorizeColor = FILTERED_COLOR;
        } else if (link.isLit) {
          colorizeColor = HIGHLIGHT_COLOR;
        }

        if (colorizeColor) {
          linkColor = AdpForceGraphHelpers.mixColors(link.col, colorizeColor, vm.config.hlColorize / 100, brightness);
        } else {
          linkColor = link.col || DEFAULT_COLOR;
        }

        return linkColor;
      }

      function linkArrowColor(link) {
        var isMarked = link.isLit || link.isFiltered || link.isSelected;
        var color = linkColor(link);
        var opacity = (nothingIsMarked || isMarked) ? 1 : ((100 - vm.config.hlDim) / 100);

        if (opacity === 1) {
          return color;
        } else {
          return AdpForceGraphHelpers.mixColors('black', color, opacity)
        }
      }

      function linkMaterial(link) {
        var isMarked = link.isLit || link.isFiltered || link.isSelected;
        var color = linkColor(link);
        var width = linkWidth(link);
        var opacity = (nothingIsMarked || isMarked) ? 1 : ((100 - vm.config.hlDim) / 100)
        var material = (width ? getLambertMaterial : getLineBasicMaterial)(color, opacity);

        link.isGlow = isMarked;

        return material;
      }

      function linkParticleSize(link) {
        return (link.pw || 0) * vm.config.particleSize;
      }

      function onNodeHover(hoveredObject) {
        forceGraph.controls().enabled = !hoveredObject;
      }

      function onNodeDragEnd(node) {
        if (vm.config.fixDragged) {
          node.fx = node.x;
          node.fy = node.y;
          node.fz = node.z;
        }
      }

      function isFilteredByTags(subj) {
        if (subj.tags) {
          return _.findIndex(subj.tags, isTagIsSelected) >= 0;
        }

        return false;

        function isTagIsSelected(tag) {
          return vm.config.tagsFilter.indexOf(tag) >= 0;
        }
      }

      function isNodeFiltered(node) {
        return isObjectFiltered(node, 'node', 'n,Acronym');
      }

      function isLinkFiltered(link) {
        return isObjectFiltered(link, 'link', 'n');
      }

      function isObjectFiltered(obj, type, defaultFields) {
        var filterVal = vm.config[type + 'Filter'];

        if (!filterVal) {
          return false;
        }

        var searchBy = _.get(visualisationSetup, type + 'SearchBy', defaultFields).split(',');
        filterVal = filterVal.toLowerCase();

        return !!_.find(searchBy,
          function (fieldName) {
            var value = _.get(obj, fieldName);

            return value && value.toLowerCase().indexOf(filterVal) >= 0;
          });
      }

      function linkDistance(link) {
        return ((link.dst || DEFAULT_LINK_DISTANCE) * vm.config.linkDistance) / 100;
      }

      function linkCurveRotation(link) {
        var angle = 0;

        if (link.linkTotal > 1) {
          angle = 2 * Math.PI * link.linkNumber / link.linkTotal;
        }

        return angle;
      }

      function changeLinksDistance(factor) {
        vm.config.linkDistance *= factor;
        vm.config.linkDistance = Math.round(vm.config.linkDistance);
        doCheckConfigFields();
        vm.reheatSimulation();
      }

      function doSaveConfig() {
        return $http
          .post(APP_CONFIG.apiUrl + '/graphql', {
            query: 'mutation m( $filter: userSettingsInputWithoutId, $record: userSettingsInputWithoutId ){ userSettingsUpsertOne( filter: $filter, record: $record) { settings } }',
            variables: {
              filter: {type: 'fg3d'},
              record: {settings: vm.cachedConfig, type: 'fg3d'},
            },
          })
          .then(function (resp) {
            if (resp.data.errors) {
              var message = _.map(resp.data.errors, function (err) {
                return err.message;
              }).join('; ');

              handleError(message, 'Config save failed');
            } else {
              AdpNotificationService.notifySuccess('Config is saved');
            }
          })
          .catch(function (e) {
            handleHttpError(e, 'Error while saving settings');
          });
      }

      function getConfig() {
        if (vm.cachedConfig) {
          return Promise.resolve(vm.cachedConfig)
        } else {
          return doLoadConfig();
        }
      }

      function applyConfig(conf, omitRefresh) {
        if (conf && _.values(conf).length) {
          var prevLinkDistance = vm.config.linkDistance;
          var prevTagsFilter = vm.config.tagsFilter;

          Object.assign(vm.config, conf);

          if (!omitRefresh) {
            if (prevLinkDistance !== vm.config.linkDistance) {
              vm.reheatSimulation();
            }

            vm.resetFixDragged();

            doRefreshGraph();
            vm.toggleCameraOrbit();

            if (tagsFilterInstance &&
              _.intersection(prevTagsFilter, vm.config.tagsFilter).length < vm.config.tagsFilter.length
            ) {
              tagsFilterInstance.option('value', getTagsByFilterValue(vm.config.tagsFilter));
            }
          }
        }
      }

      function handleHttpError(e, description) {
        var xhrCodes = {
          error: 'Network error or server is down',
          timeout: 'Connection timeout',
          abort: 'Aborted'
        };
        var message = e.xhrStatus === 'complete' ? (e.statusText || e.message) : xhrCodes[e.xhrStatus];

        handleError(message, description);
      }

      function handleError(message, description) {
        AdpNotificationService.notifyError((description ? description + ': ' : '') + message);
      }

      function isNode(obj) {
        return obj.__type === 'node'
      }

      function isLink(obj) {
        return obj.__type === 'link'
      }

      function getPreselectedSubjects(data) {
        return _.union(getPreselected(data.nodes), getPreselected(data.links));

        function getPreselected(items) {
          return items ? _.filter(items, function (item) {
            return item.isSelected
          }) : [];
        }
      }
    };

    function geometryCreator(node) {
      var shape = geometryCreators[node.shp] ? node.shp : DEFAULT_NODE_SHAPE;
      var geomShape = geometryCreators[shape];

      if (geomShape) {
        return geomShape(node.size || DEFAULT_NODE_SIZE);
      }
      return null;
    }

    function shortLabelText(text, max) {
      return text.length > max + 3 ? text.substring(0, max) + '\u2026' : text;
    }

    function genExportFileName(ext) {
      return 'export3d-' + new Date().getTime() + '.' + ext;
    }

    function downloadFile(params) {
      var fileName = params.fileName || 'downloaded_' + new Date().getTime();
      var blob = params.blob || new Blob([params.buffer], {type: params.mimeType || 'text/plain'});

      if (window.navigator.msSaveOrOpenBlob) {
        // IE11
        window.navigator.msSaveOrOpenBlob(blob, fileName);
      } else {
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement('a');

        document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);

        window.setTimeout(function () {
          //Just to make sure no special effects occurs
          document.body.removeChild(a);
        }, 5000);
      }

      return new $.Deferred().resolve();
    }
  }
})();
