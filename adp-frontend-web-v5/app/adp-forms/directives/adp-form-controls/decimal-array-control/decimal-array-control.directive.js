(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('decimalArrayControl', decimalArrayControl);

  function decimalArrayControl(
    AdpValidationUtils,
    AdpFieldsService,
    NumberArrayEditorConfig,
    ControlSetterGetter
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/decimal-array-control/decimal-array-control.html',
      require: '^^form',
      link: function (scope) {
        var getterSetterFn = ControlSetterGetter(scope.args);
        scope.getterSetter = function (e) {
          if (arguments.length) {
            getterSetterFn(e.value);
          }

          return getterSetterFn();
        };

        scope.isRequired = AdpValidationUtils.isRequired(scope.args.path, scope.formContext.requiredMap);
        scope.config = getConfig(scope.args.fieldSchema);

        function getConfig(field) {
          var fieldData = scope.getterSetter();
          var baseConfig = NumberArrayEditorConfig(scope.args, fieldData, scope.getterSetter);
          baseConfig.fieldTemplate = fieldTemplate;

          return AdpFieldsService.configFromParameters(field, baseConfig);
        }

        function fieldTemplate(data, container) {
          var textBox = $('<div class="adp-text-box">')
            .dxTextBox({
              placeholder: 'Type in new value and press Enter',
              mode: 'text',
              valueChangeEvent: 'blur input',
              inputAttr: {
                'adp-qaid-field-control': scope.args.path,
              },
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
