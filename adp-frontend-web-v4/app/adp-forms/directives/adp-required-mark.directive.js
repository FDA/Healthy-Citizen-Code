(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpRequiredMark', adpRequiredMark);

  function adpRequiredMark(AdpValidationService) {
    return {
      restrict: 'E',
      scope: {
        validationParams: '='
      },
      template: '<span class="text-danger" ng-show="isRequired()">&nbsp;*</span>',
      require: '^^form',
      link: function (scope) {
        scope.isRequired = AdpValidationService.isRequired(scope.validationParams);
      }
    }
  }
})();
