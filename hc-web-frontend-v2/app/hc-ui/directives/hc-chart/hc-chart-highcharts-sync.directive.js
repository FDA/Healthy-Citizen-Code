;(function () {
  'use strict';

  angular
    .module('app.hcUi')
    .directive('hcChartHighchartsSync', hcChartHighchartsSync);

  /** @ngInject */
  function hcChartHighchartsSync(
    INTERFACE,
    HcChartService,
    $timeout
  ) {
    return {
      restrict: 'E',
      scope: {
        hcChartItem: '=',
        hcChartData: '='
      },
      template: '<div data-chart-container></div>',
      link: function (scope, element) {
        scope.chartModel = INTERFACE.charts[scope.hcChartItem.parameters.chartId];
        scope.data = INTERFACE.charts[scope.hcChartItem.parameters.chartId];

        var container = $(element).find('[data-chart-container]');
        var charts = [];
        var moveEvents = [
          'mousemove.hcChartHighchartsSync',
          'touchmove.hcChartHighchartsSync',
          'touchstart.hcChartHighchartsSync'
        ].join(' ');

        function init() {
          override();
          scope.hcChartItem.data.datasets.forEach(createChart);
          bindEvents();
        }
        init();

        function createChart(dataset, chartIndex) {
          dataset.data = Highcharts.map(dataset.data, function (val, j) {
            return [scope.hcChartItem.data.xData[j], val];
          });

          var options = _.cloneDeep(scope.chartModel.specification);
          options = HcChartService.evalOptions(options, dataset, chartIndex);

          charts[chartIndex] = $('<div class="hc-highchart">');
          charts[chartIndex]
            .appendTo(container)
            .highcharts(options);
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
            chart.highcharts().destroy();
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
