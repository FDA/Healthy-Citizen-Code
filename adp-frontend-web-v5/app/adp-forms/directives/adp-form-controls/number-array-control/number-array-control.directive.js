(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('numberArrayControl', numberArrayControl);

  function numberArrayControl(
    AdpValidationUtils,
    AdpValidationRules,
    AdpFieldsService,
    NumberArrayEditorConfig
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '<',
        adpFormData: '<',
        uiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/number-array-control/number-array-control.html',
      require: '^^form',
      link: function (scope) {
        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
        scope.config = getConfig(scope.field);

        function getConfig(field) {
          var fieldData = scope.adpFormData[scope.field.fieldName];
          var baseConfig = NumberArrayEditorConfig(fieldData, updateModel);
          baseConfig.fieldTemplate = fieldTemplate;

          return AdpFieldsService.configFromParameters(field, baseConfig);
        }

        function updateModel(valueObj) {
          scope.adpFormData[scope.field.fieldName] = (valueObj.value || []).map(_.toNumber);
        }

        function fieldTemplate(data, container) {
          var numberBox = $('<div class="adp-text-box">')
            .dxNumberBox(getNumberBoxConfig());

          container.append(numberBox);
        }

        function getNumberBoxConfig() {
          var isInt = _.includes(['Int32[]', 'Int64[]'], scope.field.type);

          return {
            value: null,
            placeholder: 'Type in new value and press Enter',
            mode: 'number',
            format: isInt ? '#' : '',
            valueChangeEvent: 'blur keyup change',
          };
        }
      }
    }
  }
})();
