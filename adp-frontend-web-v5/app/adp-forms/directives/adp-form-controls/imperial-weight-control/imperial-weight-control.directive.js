(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('imperialWeightControl', imperialWeightControl);

  function imperialWeightControl(
    AdpValidationUtils,
    AdpFieldsService
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '<',
        adpFormData: '<',
        uiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/imperial-weight-control/imperial-weight-control.html',
      require: '^^form',
      link: function (scope) {
        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
        scope.config = getConfig(scope.field);

        function getConfig(field) {
          var defaults = getDefaults(field);
          return AdpFieldsService.configFromParameters(field, defaults);
        }

        function getDefaults(field) {
          var unit = AdpFieldsService.getUnitsList(field)[0];

          return {
            valueExpr: 'value',
            displayExpr: 'label',
            dataSource: unit.list,
            placeholder: 'Select ' + unit.shortName,
            showClearButton: true,
            elementAttr: {
              class: 'adp-select-box',
              id: 'list_id_' + scope.field.fieldName,
            },
          };
        }
      }
    }
  }
})();
