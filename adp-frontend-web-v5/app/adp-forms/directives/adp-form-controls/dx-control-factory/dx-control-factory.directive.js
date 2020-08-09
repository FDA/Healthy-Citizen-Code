(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('dxFieldControl', dxFieldControl);

  function dxFieldControl(
    AdpValidationUtils,
    AdpFieldsService,
    AdpUnifiedArgs,
    $injector
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '<',
        adpFormData: '<',
        uiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/dx-control-factory/dx-control-factory.html',
      require: '^^form',
      link: function (scope, el, attr, formCtrl) {
        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
        scope.args = unifiedApproachArgs();

        (function init(args) {
          var widgetConfig = getWidgetConfig(args);
          var widgetOptions = getConfig(args, widgetConfig.options);
          el.find('div')[widgetConfig.widgetName](widgetOptions);

          scope.$on('$destroy', function () {
            getInstance().dispose();
          });
        })(scope.args);

        function getConfig(args, widgetOptions) {
          var cfg = _.merge(getDefaults(args), widgetOptions);
          return AdpFieldsService.configFromParameters(args.fieldSchema, cfg);
        }

        function getDefaults(args) {
          var field = args.fieldSchema;

          return {
            value: scope.adpFormData[field.fieldName] || null,
            onInitialized: function (e) {
              scope.instance = e.component;
            },
            inputAttr: {
              autocomplete: AdpFieldsService.autocompleteValue(field),
              'field-name-input': field.fieldName,
              id: field.fieldName,
            },
            onValueChanged: function (e) {
              scope.adpFormData[field.fieldName] = e.value;
              setAngularFormProps(field);
            },
            valueChangeEvent: 'input blur',
          };
        }

        function getWidgetConfig(args) {
          var widgetConfigNamesPart = {
            String: ['String', 'Phone', 'Url', 'Email', 'PasswordAuth'],
            Number: ['Number', 'Double'],
            Decimal: ['Decimal128'],
            Int: ['Int32', 'Int64'],
            Date: ['Date', 'DateTime', 'Time'],
            Text: ['Text'],
          };

          var widgetType = _.findKey(widgetConfigNamesPart, function (val) {
            return val.includes(args.fieldSchema.type);
          });

          var name = 'Dx' + widgetType + 'Config';
          return $injector.get(name)(args);
        }

        function unifiedApproachArgs() {
          var formParams = scope.validationParams.formParams;

          return AdpUnifiedArgs.getHelperParamsWithConfig({
            path: formParams.path,
            formData: formParams.row,
            action: formParams.action,
            schema: formParams.modelSchema,
          });
        }

        function getInstance() { return scope.instance; }

        function setAngularFormProps(field) {
          var formField = formCtrl[field.fieldName];

          !formField.$dirty && formField.$setDirty();
          !formField.$touched && formField.$setTouched();
        }
      }
    }
  }
})();
