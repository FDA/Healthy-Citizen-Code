;(function () {
  'use strict';
  
  angular
    .module('app.adpDashboard')
    .directive('adpDashboardContent', adpDashboardContent);
  
  /** @ngInject */
  function adpDashboardContent (
    $compile,
    adpTemplateEngineService
  ) {
    return {
      restrict: 'E',
      scope: {
        item: '=',
        data: '='
      },
      transclude: true,
      replace: true,
      link: function (scope, element) {
        var parsedTemplate = adpTemplateEngineService.parseTemplate(
            scope.item.template,
            scope.item.parameters.color,
            scope.data
        );

        element.html(parsedTemplate);
        $compile(element.contents())(scope);
      }
    };
  }
})();
