;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormGroupWizard', adpFormGroupWizard);

  function adpFormGroupWizard(AdpFormService) {
    return {
      restrict: 'E',
      scope: {
        fields: '=',
        formData: '=',
        formParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-group/adp-form-group-wizard/adp-form-group-wizard.html',
      require: '^^form',
      link: function (scope, el, attrs, form) {
        scope.form = form;
        scope.current = 0;
        scope.groupHasErrors = AdpFormService.groupHasErrors;
        scope.groupCompleted = AdpFormService.groupCompleted;

        scope.setCurrent = function (step) {
          var groups = scope.fields.groups, fieldGroup;
          if (step === scope.current) return;

          fieldGroup = groups[scope.current].children;
          AdpFormService.setGroupDirty(fieldGroup, scope.form);

          scope.current = step;
        };

        scope.next = function () {
          var next = scope.current + 1;
          scope.setCurrent(next);
        };

        scope.prev = function () {
          var prev = scope.current - 1;
          scope.setCurrent(prev);
        };
      }
    }
  }
})();
