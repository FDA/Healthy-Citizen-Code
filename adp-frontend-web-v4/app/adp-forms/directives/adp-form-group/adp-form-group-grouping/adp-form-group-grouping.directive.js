;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormGroupGrouping', adpFormGroupGrouping);

  function adpFormGroupGrouping(AdpFormService) {
    return {
      restrict: 'E',
      scope: {
        fields: '=',
        formData: '=',
        formParams: '=',
        schema: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-group/adp-form-group-grouping/adp-form-group-grouping.html',
      require: '^^form',
      link: function (scope, el, attrs, form) {
        scope.groupHasErrors = AdpFormService.groupHasErrors;
        scope.groupCompleted = AdpFormService.groupCompleted;
        scope.form = form;
      }
    }
  }
})();
