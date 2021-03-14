(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpRequiredMark', adpRequiredMark);

  function adpRequiredMark(AdpValidationUtils) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      template: '<span class="text-danger" ng-show="isRequired()">&nbsp;*</span>',
      require: '^^form',
      link: function (scope) {
        scope.isRequired = AdpValidationUtils.isRequired(scope.args.path, scope.formContext.requiredMap);
      }
    }
  }
})();
