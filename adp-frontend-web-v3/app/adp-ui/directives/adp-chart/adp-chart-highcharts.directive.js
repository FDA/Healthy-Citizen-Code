;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .directive('adpChartHighcharts', adpChartHighcharts);

  /** @ngInject */
  function adpChartHighcharts(
    INTERFACE,
    AdpChartService,
    $timeout
  ) {
    return {
      restrict: 'E',
      template: '<div class="adp-charts-container"></div>',
      scope: {
        adpChartItem: '=',
        adpChartData: '='
      },
      replace: true,
      link: function (scope, element) {
        scope.chartModel = INTERFACE.charts[scope.adpChartItem.parameters.chartId];
        scope.chartModel.data = scope.adpChartData || scope.chartModel.data;

        if (scope.chartModel.data) {
          AdpChartService.setData(scope.chartModel)
            .then(init);
        } else {
          init(scope.chartModel.specification);
        }

        function init(options) {
          scope.options = AdpChartService.evalOptions(options);

          $timeout(function () {
            var chart = new Highcharts.chart(element[0], scope.options);
            scope.$on('$destroy', chart.destroy.bind(chart));
          }, 0);
        }
      }
    };
  }
})();
