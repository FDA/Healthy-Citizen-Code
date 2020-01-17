import { drugInteractionsVisualization } from '../../../ui/drug-interactions-visualization';

function drugInteractionsVisualizationDirective() {
  return {
    restrict: 'E',
    template: `
      <div>
        <svg id="visualization" width="1200" height="768"></svg>
      </div>
    `,
    scope: {
      data: '=',
    },
    link($scope, element) {
      const svg = element.find('svg')[0];
      drugInteractionsVisualization(svg, $scope.data);

      $scope.$on('$destroy', () => {
        d3.select(svg)
          .selectAll('svg')
          .remove();
      });
    },
  };
}

export default ['drugInteractionsVisualization', drugInteractionsVisualizationDirective];
