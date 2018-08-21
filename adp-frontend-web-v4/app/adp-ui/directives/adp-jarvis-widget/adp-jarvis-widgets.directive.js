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
        $timeout(init, 0);
        function init() {
          var options = _.clone(jarvisWidgetsDefaults);
          element.jarvisWidgets(options);
        }
      }
    }
  }
})();