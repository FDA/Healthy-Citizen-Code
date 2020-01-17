import drugReactionsChartDirective from './directives/drug-reactions-chart';
import drugInteractionsVisualization from './directives/drug-interactions-visualization';

export default function(angular) {
  return angular
    .module('hcUiUtil', [])
    .directive(...drugInteractionsVisualization)
    .directive(...drugReactionsChartDirective).name;
}
