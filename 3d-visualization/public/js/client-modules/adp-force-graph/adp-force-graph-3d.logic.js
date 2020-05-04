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
      return new Three.SphereGeometry(size);
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
      $document,
      AdpNotificationService,
      AdpClientCommonHelper,
      AdpForceGraphHelpers,
      AdpFullscreenService,
      APP_CONFIG,
      tagBoxCreator,
      initialConfig
    ) {
      var vm = this;
      var $box = null;
      var forceGraph;
      var relData = null;
      var hlLinks = []; /* todo: refactor this into Set once we migrate to ES6 */
      var hlNodes = [];
      var proms = [];
      var $container = null;
      var orbitInterval = null;
      var camOrbiter = null;
      var tagsFilterInstance = null;
      var canvasInFocus = false;
      var touchData = {};
      var nothingIsMarked = true;
      var keysConf = [
        { key: 'r', attr: 'labelLinks' },
        { key: 'e', attr: 'labelNodes' },
        { key: 'o', attr: 'animCamera', action: 'toggleCameraOrbit' },
        { key: 'm', attr: 'showOptions' },
        { key: 'd', attr: 'showLegend' },
        { key: 'x', attr: 'fixDragged', action: 'resetFixDragged' },
        { key: 'f', action: 'toggleFullscreen' },
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
        { key: 's', action: 'saveConfig' },
        { key: 'l', action: 'loadConfig' },
      ];
      var configFieldsLimits = {
        hlColorize: { min: 0, max: 100 },
        hlBrightness: { min: 0, max: 100 },
        hlDim: { min: 0, max: 100 },
        linkCurvature: { min: 0, max: 100 },
        linkDistance: { min: 1 },
        particleSize: { min:1, max:10 },
        arrowSize: { min:1, max:10 },
      };

      vm.apiUrl = APP_CONFIG.apiUrl;
      vm.isLoading = true;
      vm.savedConfig = null;
      vm.selectedNodes = [];
      vm.config = Object.assign(
        {
          showOptions: false,
          showLegend: false,
          hlLabelNodes: false,
          hlLabelLinks: false,
          hlColorize: 50,
          hlBrightness: 75,
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
        },
        initialConfig || {}
      );

      if (typeof ForceGraph === 'undefined') {
        // This polyfill is to fix pure WebXR support in Chrome 79
        if (navigator && navigator.xr && !_.isFunction(navigator.xr.requestDevice)) {
          navigator.xr.requestDevice = function () {
            return new $.Deferred().resolve(null);
          };
        }
        proms.push(AdpClientCommonHelper.loadScript(APP_CONFIG.apiUrl + '/public/js/lib/force-graph/index.js'));

        AdpClientCommonHelper.loadCss(APP_CONFIG.apiUrl + '/public/js/lib/force-graph/css/style.css?v1');
      }

      if (!relData) {
        proms.push(
          $http
            .get(APP_CONFIG.apiUrl + '/getFdaVipFgData')
            .then(function (res) {
              relData = pickNodesAndLinks(res);
              vm.legend = res.data.legend;
              vm.tags = res.data.tags;
            })
            .catch(function () {
              vm.error_message = 'Data load error';
            })
        );
      }

      doLoadConfig();

      $.when
        .apply(this, proms)
        .done(function () {
          relData &&
            $timeout(function () {
              vm.isLoading = false;
              doInitGraph();
            }, 0);
          $document.on('keypress', function (e) {
            onKeyPress(e);
          });
        })
        .catch(function (e) {
          AdpNotificationService.notifyError('Error while loading code and data: ' + e.message);
        });

      /* Methods, available from page interface, is put into vm.### */

      vm.doRefreshGraph = function () {
        doRefreshGraph();
      };

      vm.toggleConfig = function () {
        vm.config.showOptions = !vm.config.showOptions;
      };

      vm.toggleLegend = function () {
        vm.config.showLegend = !vm.config.showLegend;
      };

      vm.toggleFullscreen = function () {
        $rootScope.isFullscreen = !$rootScope.isFullscreen;
      };

      vm.reheatSimulation = function () {
        forceGraph.numDimensions(3);
      };

      vm.resetFixDragged = function () {
        if (!vm.config.fixDragged) {
          _.each(relData.nodes, function (node) {
            node.fx = undefined;
            node.fy = undefined;
          });
        }
        doRefreshGraph();
      };

      vm.toggleCameraOrbit = function () {
        var lookAtPoint;
        var lookAtFlyTime = 1500;
        var cam = forceGraph.camera();

        if (!camOrbiter) {
          camOrbiter = new OrbitControls(cam, $box[0]);

          camOrbiter.autoRotateSpeed = 5; // default is 2.0
        }

        if (vm.config.animCamera) {
          lookAtPoint = new Three.Vector3(0, 0, 0);

          if (vm.selectedNodes.length) {
            _.each(vm.selectedNodes, function (obj) {
              if (obj.__type === 'node') {
                lookAtPoint.add(obj.__threeObj.position);
              } else if (obj.__type === 'link') {
                lookAtPoint.add(
                  new Three.Vector3(
                    (obj.source.x + obj.target.x) / 2,
                    (obj.source.y + obj.target.y) / 2,
                    (obj.source.z + obj.target.z) / 2
                  )
                );
              }
            });

            lookAtPoint.divideScalar(vm.selectedNodes.length);
          }

          var camSight = new Three.Vector3(0, 0, -1);
          var lookAtDir = new Three.Vector3(0, 0, 0);

          lookAtDir.subVectors(lookAtPoint, cam.position);
          camSight.applyEuler(cam.rotation, cam.rotation.order);

          lookAtFlyTime = 3000 * camSight.angleTo(lookAtDir);

          camOrbiter.target = lookAtPoint;

          $timeout(function () {
            camOrbiter.autoRotate = true;
          }, lookAtFlyTime / 2);

          forceGraph.cameraPosition(cam.position, lookAtPoint, lookAtFlyTime);

          if (!orbitInterval) {
            orbitInterval = $interval(cameraOrbitAnimation, CAMERA_ANIMATION_INTERVAL);
          }
        } else {
          camOrbiter.autoRotate = false;

          orbitInterval && $interval.cancel(orbitInterval);
          orbitInterval = null;
        }

        camOrbiter.update();
      };

      vm.saveConfig = function () {
        vm.savedConfig = Object.assign({}, vm.config);

        doSaveConfig();
      };

      vm.loadConfig = function () {
        if (vm.savedConfig) {
          var prevLinkDistance = vm.config.linkDistance;
          var prevTagsFilter = vm.config.tagsFilter;

          AdpNotificationService.notifySuccess('Config is restored');

          Object.assign(vm.config, vm.savedConfig);

          if (prevLinkDistance !== vm.config.linkDistance) {
            vm.reheatSimulation();
          }

          if (
            tagsFilterInstance &&
            _.intersection(prevTagsFilter, vm.config.tagsFilter).length < vm.config.tagsFilter.length
          ) {
            tagsFilterInstance.option('value', getTagsByFilterValue(vm.config.tagsFilter));
          }

          vm.resetFixDragged();

          doRefreshGraph();
          vm.toggleCameraOrbit();
        }
      };

      vm.screenCapture = function () {
        vm.exportingImage = true;

        var renderer = new Three.WebGLRenderer({ preserveDrawingBuffer: true });
        var sx = forceGraph.width();
        var sy = forceGraph.height();
        var originalRatio = sx / sy;
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
        renderer.render(forceGraph.scene(), forceGraph.camera());

        var getFile = function (blob) {
          if (blob) {
            downloadFile({ blob: blob, fileName: genExportFileName('png'), mimeType: 'image/png' });
          } else {
            AdpNotificationService.notifyError('Failed to export. Seems like not enough memory');
          }

          vm.exportingImage = false;
          renderer.dispose();
        };

        if (renderer.domElement.msToBlob) {
          //for IE
          var blob = renderer.domElement.msToBlob();

          getFile(blob);
        } else {
          renderer.domElement.toBlob(getFile);
        }
      };

      vm.exportAsHtml = function () {
        vm.exportingHtml = true;
        $.when
          .apply(this, [
            $http.get(APP_CONFIG.apiUrl + '/public/js/lib/force-graph/export-template.html'),
            $http.get(APP_CONFIG.apiUrl + '/getFdaVipFgData'),
          ])
          .then(function (res1, res2) {
            var templateBody = res1.data;
            var graphRawData = res2.data;

            templateBody = templateBody
              .replace(/(window[.\w\s=]+)['"]__fg_data__['"]/, '$1' + JSON.stringify(graphRawData))
              .replace(
                /(window[.\w\s=]+)['"]__fg_config__['"]/,
                '$1' + JSON.stringify(Object.assign({}, vm.config, { showOptions: false }))
              );

            downloadFile({
              mimeType: 'text/html',
              fileName: genExportFileName('html'),
              buffer: templateBody,
            });
          })
          .catch(function (e) {
            AdpNotificationService.notifyError('Error while loading export template: ' + e.message);
          })
          .always(function () {
            vm.exportingHtml = false;
          });
      };

      function doInitGraph() {
        var $tagBox = $('.fg3d-tags-container');

        $container = $('#fg3d-container');
        $box = $('#fg3d-box');

        forceGraph = new ForceGraph();

        forceGraph($box[0])
          .onNodeClick(function (node, e) {
            onGraphClick(e, node);
          })
          .onLinkClick(function (link, e) {
            onGraphClick(e, link);
          })
          .linkOpacity(LINK_OPACITY)
          .linkDirectionalParticleColor(function (link) {
            return link.pcol || DEFAULT_COLOR;
          })
          .linkDirectionalArrowRelPos(0.5)
          .linkDirectionalParticleSpeed(AdpForceGraphHelpers.linkSpeed)
          .onBackgroundClick(function (e) {
            onGraphClick(e);
          })
          .showNavInfo(false)
          .graphData(relData);

        forceGraph.d3Force('link').distance(linkDistance);

        if (vm.savedConfig) {
          vm.loadConfig();
        } else {
          doRefreshGraph();
          vm.toggleCameraOrbit();
        }

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

        fitSize();
      }

      function doRefreshGraph() {
        var linkSprites = vm.config.labelLinks || vm.config.hlLabelLinks;

        doCheckConfigFields();

        vm.config.linkCurvature = Math.min(100, Math.max(0, vm.config.linkCurvature));

        nothingIsMarked =
          !hlLinks.length &&
          !hlNodes.length &&
          !vm.config.nodeFilter &&
          !vm.config.linkFilter &&
          !vm.selectedNodes.length;

        forceGraph
          .linkColor(linkColor)
          .linkWidth(linkWidth)
          .linkVisibility(linkVisibility)
          .linkCurvature(linkCurvature)
          .linkDirectionalArrowLength(vm.config.showArrows ? vm.config.arrowSize * 4 : 0)
          .linkDirectionalParticleWidth(vm.config.showParticles ? linkParticleSize : 0)
          .linkDirectionalParticles(vm.config.showParticles ?
            function (link) {
            return link.trf || 0;
          } : 0)
          .nodeThreeObject(nodeGeometry)
          .onNodeDragEnd(vm.config.fixDragged ? onNodeDragEnd : undefined)
          .linkThreeObjectExtend(linkSprites)
          .linkThreeObject(linkSprites ? linkSprite : undefined)
          .linkPositionUpdate(linkSprites ? linkCustomPositionUpdate : undefined);

        onInterfaceUpdate && onInterfaceUpdate(vm);
      }

      function doCheckConfigFields() {
        _.each(configFieldsLimits, function (obj, field) {
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

        hlLinks = [];
        hlNodes = [];

        _.each(vm.selectedNodes, function (obj) {
          if (obj.__type === 'node') {
            _.each(relData.links, function (link) {
              if (link.source === obj) {
                hlLinks.push(link);
                hlNodes.push(link.target);
              } else if (link.target === obj) {
                hlLinks.push(link);
                hlNodes.push(link.source);
              }
            });
            hlNodes.push(obj);
          } else {
            hlLinks = [obj];
            hlNodes = [obj.source, obj.target];
          }
        });

        doRefreshGraph();
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
        camOrbiter.update();
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

      function getNodeMaterial(color, opacity) {
        return new Three.MeshLambertMaterial({
          color: color,
          transparent: true,
          opacity: opacity,
        });
      }

      function nodeGeometry(node) {
        var geometry = geometryCreator(node);

        if (geometry) {
          var mesh;

          if (!isLayerVisible(node)) {
            // just minimal mesh with 100% opacity as we dont have option to simply hide node
            mesh = new Three.Mesh(geometryCreators.Tetrahedron(1), getNodeMaterial(DEFAULT_COLOR, 0));
          } else {
            var isLit = isNodeLit(node);
            var isFiltered = isNodeFiltered(node);
            var isSelected = node.isSelected;
            var isMarked = isLit || isFiltered || isSelected;

            var color = isSelected
              ? SELECTED_COLOR
              : isLit
              ? mixColors(node.col, HIGHLIGHT_COLOR, vm.config.hlColorize / 100, vm.config.hlBrightness / 100)
              : isFiltered
              ? mixColors(node.col, FILTERED_COLOR, vm.config.hlColorize / 100, vm.config.hlBrightness / 100)
              : (node.col || DEFAULT_COLOR).toLowerCase();

            var opacity =
              isMarked || nothingIsMarked ? NODE_COMMON_OPACITY : NODE_COMMON_OPACITY * (1 - vm.config.hlDim / 100);

            mesh = new Three.Mesh(geometry, new getNodeMaterial(color, opacity));

            // Adding text sprite with label in few cases
            if ((vm.config.labelNodes || (vm.config.hlLabelNodes && isLit) || isFiltered || isSelected) && node.l) {
              var size = node.size || DEFAULT_NODE_SIZE;
              var labelText = shortLabelText(node.l, MAX_LABEL_LENGTH);
              var sprite = new SpriteText(labelText);

              sprite.color = mixColors(color, 'white');
              sprite.textHeight = size;
              sprite.position.x = size;
              sprite.position.y = size;
              sprite.material.opacity = opacity;

              mesh.add(sprite);
            }
          }

          return mesh;
        }
        return null;
      }

      function linkSprite(link) {
        if ((vm.config.labelLinks || (vm.config.hlLabelLinks && isLinkLit(link))) && link.n) {
          var labelText = shortLabelText(link.n, MAX_LABEL_LENGTH);
          var sprite = new SpriteText(labelText);

          sprite.color = mixColors(link.col, 'white');
          sprite.textHeight = link.fsize || DEFAULT_LINK_LABEL_SIZE;

          return sprite;
        }
        return null;
      }

      function linkCustomPositionUpdate(sprite, p) {
        if (!sprite) {
          return;
        }

        var midPos = {
          x: p.start.x + (p.end.x - p.start.x) / 2.2,
          y: p.start.y + (p.end.y - p.start.y) / 2.2,
          z: p.start.z + (p.end.z - p.start.z) / 2.2,
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
        return link.isSelected
          ? SELECTED_COLOR
          : isLinkFiltered(link)
          ? mixColors(link.col, FILTERED_COLOR, vm.config.hlColorize / 100, vm.config.hlBrightness / 100)
          : isLinkLit(link)
          ? mixColors(link.col, HIGHLIGHT_COLOR, vm.config.hlColorize / 100, vm.config.hlBrightness / 100)
          : link.col;
      }

      function linkVisibility(link) {
        return (
          isLayerVisible(link) &&
          (nothingIsMarked || isLinkLit(link) || link.isSelected || isLinkFiltered(link) || vm.config.hlDim < 50)
        );
      }

      function linkParticleSize(link) {
          return (link.pw || 0) * vm.config.particleSize;
      }

      function onNodeDragEnd(node) {
        node.fx = node.x;
        node.fy = node.y;
        node.fz = node.z;
      }

      function isNodeLit(node) {
        return !!hlNodes.find(function (n) {
          return node === n;
        });
      }

      function isLinkLit(link) {
        return !!hlLinks.find(function (n) {
          return link === n;
        });
      }

      function isLayerVisible(subj) {
        return (
          (vm.config.tagsFilter.length && _.intersection(subj.tags, vm.config.tagsFilter).length) ||
          !vm.config.tagsFilter.length
        );
      }

      function isNodeFiltered(node) {
        return (
          vm.config.nodeFilter &&
          ((node.n && node.n.toLowerCase().indexOf(vm.config.nodeFilter.toLowerCase()) >= 0) ||
            (node.obj.Acronym && node.obj.Acronym.toLowerCase().indexOf(vm.config.nodeFilter.toLowerCase()) >= 0))
        );
      }

      function isLinkFiltered(link) {
        return vm.config.linkFilter && link.n && link.n.toLowerCase().indexOf(vm.config.linkFilter.toLowerCase()) >= 0;
      }

      function linkDistance(link) {
        return ((link.dst || DEFAULT_LINK_DISTANCE) * vm.config.linkDistance) / 100;
      }

      function changeLinksDistance(factor) {
        vm.config.linkDistance *= factor;
        vm.config.linkDistance = Math.round(vm.config.linkDistance);
        doCheckConfigFields();
        vm.reheatSimulation();
      }

      function pickNodesAndLinks(res) {
        var data = _.pick(res.data, ['nodes', 'links']);
        var formatTime = function (sec) {
          return moment.unix(sec).format('MM/DD/YY HH:mm');
        };
        var doTimes = function (obj) {
          obj.createdAt = formatTime(obj.crtd);
          obj.updatedAt = formatTime(obj.uptd);
          delete obj.crtd;
          delete obj.uptd;
        };

        _.each(data.nodes, function (node) {
          node.l = node.obj.Acronym || node.n;
          node.__type = 'node';
          doTimes(node);
        });

        _.each(data.links, function (node) {
          node.__type = 'link';
          if (!node.pw) {
            node.trf = 0;
          }
          doTimes(node);
        });

        return data;
      }

      function doLoadConfig(){
        return $http
          .post(APP_CONFIG.apiUrl + '/graphql', {
            query: 'query q( $filter: mongoQueryInput ) {userSettings( filter: $filter ) { items { settings } }}',
            variables: {
              filter: { "mongoQuery": "{ type: { $eq: 'fg3d'} }" },
            }
          })
          .then(function (resp) {
            vm.savedConfig = _.get(resp, 'data.data.userSettings.items[0].settings', null);
          })
          .catch(function (e) {
            AdpNotificationService.notifyError('Error while loading settings: ' + e.message);
          });
      }

      function doSaveConfig(){
        return $http
          .post(APP_CONFIG.apiUrl + '/graphql', {
            query: 'mutation m( $filter: userSettingsInputWithoutId, $record: userSettingsInputWithoutId ){ userSettingsUpsertOne( filter: $filter, record: $record) { settings } }',
            variables: {
              filter: { type: 'fg3d' },
              record: { settings: vm.savedConfig, type:'fg3d' },
            },
          })
          .then(function (resp) {
            if (resp.data.errors) {
              AdpNotificationService.notifyError(
                'Config save failed: ' +
                _.map(resp.data.errors, function (err) {
                  return err.message;
                }).join('; ')
              );
            } else {
              AdpNotificationService.notifySuccess('Config is saved');
            }
          })
          .catch(function (e) {
            AdpNotificationService.notifyError('Error while saving settings: ' + e.message);
          });
      }
    };

    function geometryCreator(node) {
      var geomShape = geometryCreators[node.shp || DEFAULT_NODE_SHAPE];

      if (geomShape) {
        return geomShape(node.size || DEFAULT_NODE_SIZE);
      }
      return null;
    }

    function shortLabelText(text, max) {
      return text.length > max + 3 ? text.substring(0, max) + '\u2026' : text;
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

    function genExportFileName(ext) {
      return 'export3d-' + new Date().getTime() + '.' + ext;
    }

    function downloadFile(params) {
      var fileName = params.fileName || 'downloaded_' + new Date().getTime();
      var blob = params.blob || new Blob([params.buffer], { type: params.mimeType || 'text/plain' });

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
