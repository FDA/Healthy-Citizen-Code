;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .directive('adpChart', adpChart);

  /** @ngInject */
  function adpChart(
    AdpChartService,
    $compile,
    $q
  ) {
    return {
      restrict: 'E',
      scope: {
        item: '=',
        data: '=',
      },
      transclude: true,
      replace: true,
      link: function (scope, element) {
        var INTERFACE = window.adpAppStore.appInterface();
        var chartDefinition = INTERFACE.charts[scope.item.parameters.chartId];
        scope.chartOptions = chartDefinition.specification;

        var requestParams = chartDefinition.data;
        var type = chartDefinition.subtype.toLowerCase();

        var initPromise = requestParams ?
          AdpChartService.fetchData(requestParams) :
          $q.when(scope.data);

        scope.loading = true;
        initPromise
          .then(function (data) {
            scope.chartData = data;
            scope.loading = false;
          });

        var template = [
          '<adp-chart-' + type,
            ' ng-if=!loading',
            ' options=chartOptions',
            ' data=chartData',
          '>',
          '</adp-chart-' + type + '>',
        ].join('');

        element.replaceWith($compile(template)(scope));
      }
    };
  }
})();
