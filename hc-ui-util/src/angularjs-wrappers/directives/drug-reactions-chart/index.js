import { drugReactionsChart } from '../../../ui/drug-reactions-chart';

function drugReactionsChartDirective() {
  return {
    restrict: 'E',
    template: '<div class="chart-container"></div>',
    scope: {
      medication: '=',
      reactions: '=',
    },
    link($scope, element) {
      const { medication } = $scope;
      const { reactions } = $scope;

      const chart = drugReactionsChart(element[0], { medication, reactions });
      $scope.$on('$destroy', chart.destroy.bind(chart));
    },
  };
}

export default ['drugReactionsChart', drugReactionsChartDirective];
