;(function () {
  'use strict';
  
  angular
    .module('app.hcDashboard')
    .directive('hcDashboardContent', hcDashboardContent);
  
  /** @ngInject */
  function hcDashboardContent (
    $compile,
    hcTemplateEngineService
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
        var parsedTemplate = hcTemplateEngineService.parseTemplate(
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
