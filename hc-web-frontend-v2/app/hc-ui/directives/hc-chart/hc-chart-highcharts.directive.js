;(function () {
  'use strict';

  angular
    .module('app.hcUi')
    .directive('hcChartHighcharts', hcChartHighcharts);

  /** @ngInject */
  function hcChartHighcharts(INTERFACE, HcChartService) {
    return {
      restrict: 'E',
      scope: {
        hcChartItem: '=',
        hcChartData: '='
      },
      link: function (scope, element) {
        scope.chartModel = INTERFACE.charts[scope.hcChartItem.parameters.chartId];

        if (scope.chartModel.data) {
          HcChartService.setData(scope.chartModel)
            .then(init);
        } else {
          init(scope.chartModel.specification);
        }

        function init(options) {
          scope.options = HcChartService.evalOptions(options);
          var chart = new Highcharts.chart(element[0], scope.options);
          scope.$on('$destroy', chart.destroy.bind(chart));
        }
      }
    };
  }
})();
