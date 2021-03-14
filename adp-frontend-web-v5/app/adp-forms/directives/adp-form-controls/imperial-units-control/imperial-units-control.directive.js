(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('imperialUnitsControl', imperialUnitsControl);

  function imperialUnitsControl(
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
      templateUrl: 'app/adp-forms/directives/adp-form-controls/imperial-units-control/imperial-units-control.html',
      require: '^^form',
      link: function (scope) {
        var field = scope.args.fieldSchema;
        var units = AdpFieldsService.getUnitsList(field);
        var getterSetterFn = ControlSetterGetter(scope.args);
        scope.getterSetter = getterSetterFn;

        scope.isRequired = AdpValidationUtils.isRequired(scope.args.path, scope.formContext.requiredMap);

        scope.configFirstUnit = createConfig(units[0], 0);
        scope.configSecondUnit = createConfig(units[1], 1);

        function createConfig(unit, position) {
          var defaults = {
            value: getData(position),
            valueExpr: 'value',
            displayExpr: 'label',
            dataSource: unit.list,
            placeholder: 'Select ' + unit.shortName,
            showClearButton: true,
            onValueChanged: function (e) {
              setData(e.value, position);
            },
            elementAttr: {
              class: 'adp-select-box',
              id: 'list_id_' + field.fieldName + '_' + position,
            },
            inputAttr: {
              'adp-qaid-imperial-unit-control': scope.args.path + '_' + position,
            },
            itemTemplate: function (data, index, element) {
              element.attr('adp-qaid-control-dropdown-item', scope.args.path + '_' + position);
              return data.label;
            },
          }

          return AdpFieldsService.configFromParameters(field, defaults);
        }

        function getData(position) {
          var val = getterSetterFn();
          if (_.isEmpty(val)) {
            return null;
          }

          return val[position];
        }

        function setData(value, position) {
          var val = getterSetterFn();
          var valueList = _.isEmpty(val) ? [0, 0] : val;

          valueList[position] = value;
          var newVal = _.isEmpty(_.compact(valueList)) ? null : valueList;
          getterSetterFn(newVal);
        }
      }
    }
  }
})();
