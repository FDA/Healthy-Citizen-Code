(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('selectMultipleControl', selectMultipleControl);

  function selectMultipleControl(
    AdpFieldsService,
    AdpFieldFormatUtil,
    AdpValidationService
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/select-multiple-control/select-multiple-control.html',
      require: '^^form',
      link: function (scope) {
        scope.adpFormData[scope.field.keyName] = scope.adpFormData[scope.field.keyName] || [];
        scope.listOfValues = AdpFieldsService.getListOfOptions(scope.field.list);

        scope.options = {
          formatResult: AdpFieldFormatUtil.formatSelectLabel,
          formatSelection: AdpFieldFormatUtil.formatSelectSelection
        };

        scope.isRequired = AdpValidationService.isRequired(scope.validationParams);
      }
    }
  }
})();
