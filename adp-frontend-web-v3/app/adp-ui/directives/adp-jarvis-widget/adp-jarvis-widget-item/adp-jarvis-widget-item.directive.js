;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .directive('adpJarvisWidgetItem', adpJarvisWidgetItem);

  function adpJarvisWidgetItem() {
    return {
      restrict: 'E',
      scope: {
        options: '<?'
      },
      templateUrl: 'app/adp-ui/directives/adp-jarvis-widget/adp-jarvis-widget-item/adp-jarvis-widget-item.html',
      transclude: {
        'header': '?widgetHeader',
        'body': '?widgetBody'
      }
    }
  }
})();