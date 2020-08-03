(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('treeSelectorControl', treeSelectorControl);

  function treeSelectorControl(
    GraphqlTreeSelectorQuery,
    AdpUnifiedArgs,
    AdpValidationUtils
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '<',
        adpFormData: '<',
        uiProps: '<',
        validationParams: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/tree-selector-control/tree-selector-control.html',
      require: '^^form',
      link: function (scope) {
        (function init() {
          scope.adpFormData[scope.field.fieldName] = scope.adpFormData[scope.field.fieldName] || [];
          scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
          scope.args = unifiedApproachArgs();
        })();

        function unifiedApproachArgs() {
          var formParams = scope.validationParams.formParams;

          return AdpUnifiedArgs.getHelperParamsWithConfig({
            path: formParams.path,
            formData: formParams.row,
            action: formParams.action,
            schema: formParams.fieldSchema,
          });
        }
      }
    }
  }
})();
