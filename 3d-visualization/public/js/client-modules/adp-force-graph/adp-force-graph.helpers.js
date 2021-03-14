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

    function prepareGraphData(inputData, buildDynamicLegend, mergeSimilarLegendItems) {
      const newLegend = {nodes: {}, links: {}};

      var types = {
        nodes: {
          styleAttrName: _.get(inputData, 'nodeStyleAttribute'),
          defaults: _.get(inputData, 'defaultStyles.node', {}),
          typedProcess: function (node) {
            node.__type = 'node';
            node.l = node.obj.Acronym || node.n;
            node.shp = node.shp || 'sphere';
          }
        },
        links: {
          styleAttrName: _.get(inputData, 'linkStyleAttribute'),
          defaults: _.get(inputData, 'defaultStyles.link', {}),
          typedProcess: function (link) {
            link.__type = 'link';
            if (!link.pw) {
              link.trf = 0;
            }
          }
        }
      }

      // 1.  Extracting styles in legend items
      _.each(types, function (conf, type) {
        var legendSection = _.get(inputData, 'legend.' + type, []);

        _.each(legendSection, function (item) {
          if (conf.styleAttrName) {
            var style = getStyle(item, conf.styleAttrName);

            Object.assign(item, Object.assign({}, conf.defaults, style, item));

            if (!item.text) {
              item.text = item[conf.styleAttrName];
            }

            delete item[conf.styleAttrName];
          }
          updateLegendWithItem(newLegend[type], item, item.text, mergeSimilarLegendItems);
        });
      });

      // 2. Extracting styles in nodes and links and check if types are present in legend
      _.each(types, function (conf, type) {
        _.each(inputData[type] || [], function (item) {
          var style = getStyle(item, conf.styleAttrName);

          Object.assign(item, Object.assign({}, conf.defaults, style, item));

          conf.typedProcess && conf.typedProcess(item);
          commonProcess(item);

          if (buildDynamicLegend) {
            updateLegendWithItem(newLegend[type], item,
              item[conf.styleAttrName] || (item.obj && item.obj.Acronym) || item.n, false);
          }
        });

        newLegend[type] = _.values(newLegend[type])
          .sort(function (a, b) {
            if (!a.text) {
              return 1;
            }
            if (!b.text) {
              return -1;
            }
            return a.text.toLowerCase() > b.text.toLowerCase() ? 1 : -1;
          });
      });

      inputData.legend = newLegend;

      return inputData;

      function commonProcess(obj) {
        obj.createdAt = obj.crtd;
        obj.updatedAt = obj.uptd;
        obj.col = obj.col || DEFAULT_COLOR;
        delete obj.crtd;
        delete obj.uptd;
      }

      function getStyle(object, styleAttrName) {
        if (styleAttrName) {
          return _.find(inputData.styles || [], function (val, key) {
            return object[styleAttrName] && key && key.toLowerCase() === object[styleAttrName].toLowerCase()
          }) || {};
        } else {
          return {};
        }
      }

      function updateLegendWithItem(dictionary, item, itemLabel, mergeSimilarItemsLabels) {
        var legendKey = item.shp + '___' + item.w + '___' + item.col;

        if (dictionary[legendKey]) {
          if (mergeSimilarItemsLabels) {
            dictionary[legendKey].text = dictionary[legendKey].text + '; ' + itemLabel;
          }
        } else {
          dictionary[legendKey] = Object.assign({}, item, {text:itemLabel});
        }
      }
    }

    return {
      linkSpeed: linkSpeed,
      fitGraphSize: fitGraphSize,
      linkParticleColor: linkParticleColor,
      mixColors: mixColors,
      prepareGraphData: prepareGraphData,
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
