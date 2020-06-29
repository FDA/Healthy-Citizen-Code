(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('imperialUnitsControl', imperialUnitsControl);

  function imperialUnitsControl(
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
      templateUrl: 'app/adp-forms/directives/adp-form-controls/imperial-units-control/imperial-units-control.html',
      require: '^^form',
      link: function (scope) {
        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams)
        var units = AdpFieldsService.getUnitsList(scope.field)

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
              id: 'list_id_' + scope.field.fieldName + '_' + position,
            },
          }

          return AdpFieldsService.configFromParameters(scope.field, defaults);
        }

        function getData(position) {
          if (_.isEmpty(scope.adpFormData[scope.field.fieldName])) {
            return null;
          }

          return scope.adpFormData[scope.field.fieldName][position];
        }

        function setData(value, position) {
          var valueList = _.isEmpty(scope.adpFormData[scope.field.fieldName]) ? [0, 0] :
            scope.adpFormData[scope.field.fieldName];

          valueList[position] = value;

          if (_.isEmpty(_.compact(valueList))) {
            scope.adpFormData[scope.field.fieldName] = null;
          } else {
            scope.adpFormData[scope.field.fieldName] = valueList;
          }
        }
      }
    }
  }
})();
