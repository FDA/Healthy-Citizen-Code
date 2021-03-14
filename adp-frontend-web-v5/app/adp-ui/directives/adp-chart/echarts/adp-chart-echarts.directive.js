;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .directive('adpChartEcharts', adpChartEcharts);

  /** @ngInject */
  function adpChartEcharts(
    AdpChartService,
    $timeout
  ) {
    return {
      restrict: 'E',
      template: '<div style="width: 100%; height: 100%;" class="adp-charts-container"></div>',
      scope: {
        options: '=',
        data: '=',
      },
      replace: true,
      link: function (scope, element) {
        $timeout(init);

        function init() {
          var chart = echarts.init(element[0]);
          var chartOptions = AdpChartService.evalOptions(scope.options);
          var dataFromOptions = _.get(chartOptions, 'dataset.source', scope.data);

          if (scope.data) {
            if (_.isEmpty(dataFromOptions)) {
              scope.options = setNoDataMessageOptions(chartOptions.title.text);
            } else {
              _.set(chartOptions, 'dataset.source', scope.data);
            }
          }

          chart.setOption(chartOptions);
          chart.resize();
          bindEvents(chart);
        }

        function bindEvents(chart) {
          $(window).on('resize.echarts', _.debounce(function () {
            chart.resize();
          }, 200));

          scope.$watch(
            function () {
              return element.parent().width()
            },
            function (newVal, oldVal) {
              if (newVal !== oldVal) {
                chart.resize();
              }
            }
          );

          scope.$on('$destroy', function () {
            chart.dispose();
            $(window).off('resize.echarts');
          });
        }

        function setNoDataMessageOptions(title) {
          var title = title || '';

          var opts = {
            title: {
              show: true,
              textStyle: {
                color: '#bcbcbc',
                lineHeight: 32,
              },
              text: 'No Data Available for \n "' + title + '"',
              left: 'center',
              top: 'center'
            }
          };

          return opts;
        }
      }
    };
  }
})();
