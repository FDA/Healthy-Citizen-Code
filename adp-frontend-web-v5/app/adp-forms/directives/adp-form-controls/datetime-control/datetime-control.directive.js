(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('datetimeArrayControl', datetimeArrayControl);

  function datetimeArrayControl(
    StringArrayEditorConfig,
    DxDateConfig,
    AdpValidationUtils,
    AdpFieldsService,
    ControlSetterGetter
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/datetime-control/datetime-control.html',
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
        scope.config = getFieldConfig();

        function getFieldConfig() {
          var fieldData = scope.getterSetter();
          var tagBoxConfig = getTagBoxConfig(scope.args, fieldData, scope.getterSetter);

          return AdpFieldsService.configFromParameters(scope.args.fieldSchema, tagBoxConfig);
        }

        var cmp;
        function getTagBoxConfig(args, fieldData, valueSetter) {
          var tagBoxConfig = StringArrayEditorConfig(args, fieldData, valueSetter);
          tagBoxConfig.onInitialized = function (e) {
            cmp = e.component;
          }
          tagBoxConfig.fieldTemplate = fieldTemplate;

          var tagTemplate = tagBoxConfig.tagTemplate;
          tagBoxConfig.tagTemplate = function (data, tagEl) {
            var dateTimeData = _.clone(data);
            dateTimeData.label = formatDate(dateTimeData.label, scope.args.fieldSchema.type);
            tagTemplate.call(this, dateTimeData, tagEl);
          }

          return tagBoxConfig;
        }


        function fieldTemplate(data, container) {
          var cfg = getFieldTemplateOptions(scope.args);
          var dateBox = $('<div class="adp-text-box">').dxDateBox(cfg);

          container.append(dateBox);
        }

        function getFieldTemplateOptions(args) {
          var fieldType = args.fieldSchema.type.replace('[]', '');
          var momentFormat = AdpValidationUtils.getDateFormat(fieldType);
          var dxFormat = momentFormat
            .replace(/D/g, 'd')
            .replace(/Y/g, 'y');

          return {
            type: fieldType.toLowerCase(),
            placeholder: momentFormat,
            displayFormat: dxFormat,
            showAnalogClock: false,
            valueChangeEvent: 'blur',
            useMaskBehavior: true,
            onFocusOut: setValueForTagComponent,
            showDropDownButton: false,
            openOnFieldClick: true,
          };
        }

        function formatDate(date, type) {
          var dateType = type.replace('[]', '');
          var format = AdpValidationUtils.getDateFormat(dateType);

          return dayjs(date).format(format);
        }

        function setValueForTagComponent(e) {
          // patch, which allows to trigger on value change for parent component - tagBox
          // refer to StringArrayEditorConfig comment for details
          var value = e.component.option('value');
          if (!value) {
            return;
          }

          var dataSource = cmp.option('dataSource');
          var itemWithMaxId = dataSource.length ?
            dataSource[dataSource.length - 1] :
            { id: -1 };

          dataSource.push({
            label: value,
            id: itemWithMaxId.id + 1,
          });

          cmp.option('dataSource', dataSource);
          cmp.option('value', _.range(0, dataSource.length));
        }
      }
    }
  }
})();
