;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormGroupAccordion', adpFormGroupAccordion);

  function adpFormGroupAccordion(AdpFormService) {
    return {
      restrict: 'E',
      scope: {
        fields: '=',
        formData: '=',
        formParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-group/adp-form-group-accordion/adp-form-group-accordion.html',
      require: '^^form',
      link: function (scope, el, attrs, form) {
        scope.groupHasErrors = AdpFormService.groupHasErrors;
        scope.groupCompleted = AdpFormService.groupCompleted;
        scope.form = form;
      }
    }
  }
})();
