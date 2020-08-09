;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .directive('adpChart', adpChart);

  /** @ngInject */
  function adpChart($compile, INTERFACE) {
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
          '<adp-chart-' + type,
          ' adp-chart-data=data',
          ' adp-chart-item=item>',
          '</adp-chart-' + type + '>',
        ].join('');

        element.replaceWith($compile(template)(scope));
      }
    };
  }
})();
