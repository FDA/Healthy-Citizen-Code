(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('numberArrayControl', numberArrayControl);

  function numberArrayControl(
    AdpValidationUtils,
    AdpValidationRules,
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
      templateUrl: 'app/adp-forms/directives/adp-form-controls/number-array-control/number-array-control.html',
      require: '^^form',
      link: function (scope) {
        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
        scope.config = getConfig(scope.field);
        _.remove(scope.field.validate, function (v) {
          return _.includes(['int32', 'int64'], v.validator);
        });

        function getConfig(field) {
          var defaults = getDefaults(field);
          return AdpFieldsService.configFromParameters(field, defaults);
        }

        function getDefaults(field) {
          return {
            elementAttr: {
              class: 'adp-select-box',
            },
            acceptCustomValue: true,
            openOnFieldClick: false,
            onValueChanged: function (e) {
              if (e.value && e.value.length === 0) {
                scope.adpFormData[field.fieldName] = null;
              }
            },
            valueExpr: _.toNumber,
            fieldTemplate: fieldTemplate,
          };
        }

        function fieldTemplate(data, container) {
          var isValid = true;

          var numberBox = $('<div class="adp-text-box">')
            .dxNumberBox({
              placeholder: 'Type in new value and press Enter',
              mode: 'number',
              valueChangeEvent: 'blur keyup change',
              format: '#',
              showSpinButtons: true,
              onKeyDown: function(e) {
                if(!isValid && e.event.key === 'Enter') {
                  e.event.stopImmediatePropagation();
                }
              },
              onValueChanged: setValidityToTabBox,
            });

          function setValidityToTabBox(e) {
            var validationMethod = selectValidator(scope.field.type)
            isValid = AdpValidationRules[validationMethod](e.value);
            scope.form[scope.field.fieldName].$setValidity(validationMethod, isValid);

            !isValid && scope.form[scope.field.fieldName].$setDirty(isValid);
          }

          function selectValidator(type) {
            return ({
              'Int32[]': 'int32',
              'Int64[]': 'int64',
            })[type];
          }

          container.append(numberBox);
        }

      }
    }
  }
})();
