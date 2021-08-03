;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .directive('adpTooltip', adpTooltip);

  function adpTooltip($timeout) {
    return {
      restrict: 'E',
      scope: {
        adpField: '='
      },
      replace: true,
      templateUrl: 'app/adp-ui/directives/adp-tooltip/adp-tooltip.template.html',
      link: function (scope, element) {
        $timeout(function () {
          scope.hasDescription = !_.isUndefined(scope.adpField.description);
          if (!scope.hasDescription) {
            return;
          }

          scope.tooltipOptions = {
            target: element.find('.adp-tooltip-trigger'),
            position: 'top',
            showEvent: 'click',
          };
        });
      }
    }
  }
})();
