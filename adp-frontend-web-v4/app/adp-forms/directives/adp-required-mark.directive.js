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
        // refactor: required status should update in realtime. AdpValidationService.isRequired is not suitable
        // refactor: form replace with  (required in formField.$validators)
        scope.isRequired = AdpValidationService.isRequired(scope.validationParams);
      }
    }
  }
})();
