;(function () {
  'use strict';

  angular
    .module('app.hcUi')
    .directive('hcChart', hcChart);

  /** @ngInject */
  function hcChart($compile, INTERFACE) {
    return {
      restrict: 'E',
      scope: {
        item: '=',
        data: '='
      },
      transclude: true,
      replace: true,
      link: function (scope, element) {
        var chartData = INTERFACE.charts[scope.item.parameters.chartId];
        var type = chartData.subtype.toLocaleLowerCase();

        var template = [
          '<hc-chart-' + type,
          ' hc-chart-data=data',
          ' hc-chart-item=item>',
          '</hc-chart-' + type + '>',
        ].join('');

        element.replaceWith($compile(template)(scope));
      }
    };
  }
})();
