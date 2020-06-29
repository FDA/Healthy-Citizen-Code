(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('readonlyControl', readonlyControl);

  function readonlyControl(HtmlCellRenderer, AdpUnifiedArgs) {
    return {
      restrict: 'E',
      scope: {
        field: '<',
        adpFormData: '<',
        uiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/readonly-control/readonly-control.html',
      require: '^^form',
      link: function (scope) {
        var args = AdpUnifiedArgs.getHelperParamsWithConfig({
          path: scope.field.fieldName,
          formData: scope.adpFormData,
          action: scope.validationParams.formParams.action,
          schema: scope.validationParams.schema,
        });

        scope.template = HtmlCellRenderer(args)(args);
      }
    }
  }
})();
