;(function () {
  'use strict';

  angular
    .module('app.hcForms')
    .directive('hcTooltip', hcTooltip);

  function hcTooltip($sce) {
    return {
      restrict: 'E',
      scope: {
        hcField: '='
      },
      replace: true,
      templateUrl: 'app/hc-forms/directives/hc-tooltip/hc-tooltip.template.html',
      link: function (scope) {
        scope.tooltipHtml = function (field) {
          return $sce.trustAsHtml(
            '<span class="fa- fa fa-warning"></span> ' + field.description
          ).$$unwrapTrustedValue();
        }
      }
    }
  }
})();
