(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('dxFieldControl', dxFieldControl);

  function dxFieldControl(
    AdpValidationUtils,
    AdpFieldsService,
    AdpUnifiedArgs,
    $injector,
    ControlSetterGetter,
    DX_CONTROLS
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/dx-control-factory/dx-control-factory.html',
      require: '^^form',
      link: function (scope, el, attr, formCtrl) {
        var getterSetterFn = ControlSetterGetter(scope.args);
        scope.getterSetter = getterSetterFn;
        scope.isRequired = AdpValidationUtils.isRequired(scope.args.path, scope.formContext.requiredMap);

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

          cfg.onValueChanged = function (e) {
            if (widgetOptions.onValueChanged) {
              var shouldPreventChange = widgetOptions.onValueChanged(e) !== undefined;
              if (shouldPreventChange) {
                return;
              }
            }

            getterSetterFn(e.value);
            setAngularFormProps(args.fieldSchema);
          }

          return AdpFieldsService.configFromParameters(args.fieldSchema, cfg);
        }

        function getDefaults(args) {
          var field = args.fieldSchema;
          var initialValue = getterSetterFn();

          return {
            value: _.isNil(initialValue) ? null : initialValue,
            onInitialized: function (e) {
              scope.instance = e.component;
            },
            inputAttr: {
              autocomplete: AdpFieldsService.autocompleteValue(field),
              'field-name-input': field.fieldName,
              id: field.fieldName,
              'adp-qaid-field-control': scope.args.path,
            },
            valueChangeEvent: 'input blur',
          };
        }

        function getWidgetConfig(args) {
          var widgetType = _.findKey(DX_CONTROLS, function (val) {
            return val.includes(args.fieldSchema.type);
          });

          var name = 'Dx' + widgetType + 'Config';
          return $injector.get(name)(args);
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
