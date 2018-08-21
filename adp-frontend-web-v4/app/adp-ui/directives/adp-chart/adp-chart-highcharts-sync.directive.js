;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .directive('adpChartHighchartsSync', adpChartHighchartsSync);

  /** @ngInject */
  function adpChartHighchartsSync(
    AdpChartService,
    $timeout
  ) {
    return {
      restrict: 'E',
      scope: {
        adpChartItem: '=',
        adpChartData: '='
      },
      template: '<div data-chart-container></div>',
      link: function (scope, element) {
        var INTERFACE = window.adpAppStore.appInterface();

        scope.chartModel = INTERFACE.charts[scope.adpChartItem.parameters.chartId];
        scope.data = INTERFACE.charts[scope.adpChartItem.parameters.chartId];

        var container = $(element).find('[data-chart-container]');
        var charts = [];
        var moveEvents = [
          'mousemove.adpChartHighchartsSync',
          'touchmove.adpChartHighchartsSync',
          'touchstart.adpChartHighchartsSync'
        ].join(' ');

        function init() {
          override();
          scope.adpChartItem.data.datasets.forEach(createChart);
          bindEvents();
        }
        init();

        function createChart(dataset, chartIndex) {
          dataset.data = Highcharts.map(dataset.data, function (val, j) {
            return [scope.adpChartItem.data.xData[j], val];
          });

          var options = _.cloneDeep(scope.chartModel.specification);
          options = AdpChartService.evalOptions(options, dataset, chartIndex);

          charts[chartIndex] = $('<div class="adp-higadphart">');
          charts[chartIndex]
            .appendTo(container)
            .higadpharts(options);
        }

        function bindEvents() {
          // WORKAROUND content ready event
          $timeout(function() {
            window.dispatchEvent(new Event('resize'));
          }, 0);
          container.on(moveEvents, onMove);
          scope.$on('$destroy', onDestroy);
        }

        function onMove(e) {
          var chart,
            point,
            i,
            event;

          for (i = 0; i < Highcharts.charts.length; i = i + 1) {
            chart = Highcharts.charts[i];

            if (!_.isUndefined(chart)) {
              event = chart.pointer.normalize(e.originalEvent);
              point = chart.series[0].searchPoint(event, true);
              point && point.highlight(e);
            }
          }
        }

        function onDestroy() {
          container.off(moveEvents);
          charts.forEach(function (chart) {
            chart.higadpharts().destroy();
          });
        }

        function override() {
          Highcharts.Pointer.prototype.reset = function () {
            return undefined;
          };

          Highcharts.Point.prototype.highlight = function (event) {
            this.onMouseOver();
            this.series.chart.tooltip.refresh(this);
            this.series.chart.xAxis[0].drawCrosshair(event, this);
          };
        }
      }
    };
  }
})();
