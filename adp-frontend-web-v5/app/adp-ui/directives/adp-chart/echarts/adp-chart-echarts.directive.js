;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .directive('adpChartEcharts', adpChartEcharts);

  /** @ngInject */
  function adpChartEcharts(
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
          if (_.isEmpty(scope.data)) {
            scope.options = setNoDataMessageOptions(scope.options.title.text);
          } else {
            _.set(scope.options, 'dataset.source', scope.data);
          }

          chart.setOption(scope.options);
          chart.resize();
          bindEvents(chart);
        }

        function bindEvents(chart) {
          $(window).on('resize.echarts', _.debounce(function () {
            chart.resize();
          }, 100));

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
