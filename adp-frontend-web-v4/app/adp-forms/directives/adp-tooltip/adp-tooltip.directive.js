;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpTooltip', adpTooltip);

  function adpTooltip($sce) {
    return {
      restrict: 'E',
      scope: {
        adpField: '='
      },
      replace: true,
      templateUrl: 'app/adp-forms/directives/adp-tooltip/adp-tooltip.template.html',
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
