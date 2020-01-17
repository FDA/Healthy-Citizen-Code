(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpRequiredMark', adpRequiredMark);

  function adpRequiredMark(AdpValidationUtils) {
    return {
      restrict: 'E',
      scope: {
        validationParams: '='
      },
      template: '<span class="text-danger" ng-show="isRequired()">&nbsp;*</span>',
      require: '^^form',
      link: function (scope) {
        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
      }
    }
  }
})();
