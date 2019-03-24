;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .directive('adpJarvisWidgets', adpJarvisWidgets);

  function adpJarvisWidgets($timeout, jarvisWidgetsDefaults) {
    return {
      restrict: 'EA',
      template: '<div ng-transclude class="adp-widget-grid jarviswidget-grid clearfix"></div>',
      transclude: true,
      link: function (scope, element) {
        function init() {
          var options = _.defaults(jarvisWidgetsDefaults, {});

          $timeout(function () {
            element.jarvisWidgets(options);
          }, 0);
        }

        scope.$watch(
          function () {
            var items = element[0].querySelectorAll('.adp-form-fieldset');
            return items.length;
          },
          function (newValue, oldValue) {
            if (newValue !== oldValue) {
              init();
            }
          }
        );
      }
    }
  }
})();