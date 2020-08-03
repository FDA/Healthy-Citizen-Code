(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('decimalArrayControl', decimalArrayControl);

  function decimalArrayControl(
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
      templateUrl: 'app/adp-forms/directives/adp-form-controls/decimal-array-control/decimal-array-control.html',
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
          scope.adpFormData[scope.field.fieldName] = valueObj.value;
        }

        function fieldTemplate(data, container) {
          var textBox = $('<div class="adp-text-box">')
            .dxTextBox({
              placeholder: 'Type in new value and press Enter',
              mode: 'text',
              valueChangeEvent: 'blur input',
              onKeyPress: function (e) {
                var isDecimalChar = /(\+|-|\.|(\d|e))/.test(e.event.key);
                if (!isDecimalChar) {
                  e.event.preventDefault();
                }
              },
              onPaste: function (e) {
                e.event.preventDefault();
                var pasteText = e.event.originalEvent.clipboardData.getData('text');
                this.option('value', pasteText.replace(/[^0-9.\-+]/g, ''));
              },
            });

          container.append(textBox);
        }
      }
    }
  }
})();
