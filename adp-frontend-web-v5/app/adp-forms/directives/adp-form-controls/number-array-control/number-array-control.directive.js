(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('numberArrayControl', numberArrayControl);

  function numberArrayControl(
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
      templateUrl: 'app/adp-forms/directives/adp-form-controls/number-array-control/number-array-control.html',
      require: '^^form',
      link: function (scope) {
        var getterSetterFn = ControlSetterGetter(scope.args);
        scope.getterSetter = function (val) {
          if (arguments.length) {
            var formattedVal = (val.value || []).map(_.toNumber);
            getterSetterFn(formattedVal);
          }

          return getterSetterFn();
        }

        scope.isRequired = AdpValidationUtils.isRequired(scope.args.path, scope.formContext.requiredMap);
        scope.config = getConfig(scope.args.fieldSchema);

        function getConfig(field) {
          var fieldData = scope.getterSetter();
          var baseConfig = NumberArrayEditorConfig(scope.args, fieldData, scope.getterSetter);
          baseConfig.fieldTemplate = fieldTemplate;

          return AdpFieldsService.configFromParameters(field, baseConfig);
        }

        function fieldTemplate(data, container) {
          var numberBox = $('<div class="adp-text-box">')
            .dxNumberBox(getNumberBoxConfig());

          container.append(numberBox);
        }

        function getNumberBoxConfig() {
          var isInt = _.includes(['Int32[]', 'Int64[]'], scope.args.fieldSchema.type);

          return {
            value: null,
            placeholder: 'Type in new value and press Enter',
            format: isInt ? '#' : '',
            valueChangeEvent: 'blur keyup change',
            inputAttr: {
              'adp-qaid-field-control': scope.args.path,
            }
          };
        }
      }
    }
  }
})();
