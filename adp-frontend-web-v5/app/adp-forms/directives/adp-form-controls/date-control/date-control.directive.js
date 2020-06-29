;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('dateControl', dateControl);

  function dateControl(
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
      templateUrl: 'app/adp-forms/directives/adp-form-controls/date-control/date-control.html',
      require: '^^form',
      link: function (scope) {
        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
        scope.config = getConfig(scope.field);

        function getConfig(field) {
          var defaults = getOptions(field);
          return AdpFieldsService.configFromParameters(field, defaults);
        }

        getOptions(scope.field);

        function getOptions(field) {
          var fieldType = field.type;
          var momentFormat = AdpValidationUtils.getDateFormat(fieldType);

          var formatForDx = momentFormat
            .replace(/D/g, 'd')
            .replace(/Y/g, 'y');

          var options = {
            type: fieldType.toLowerCase(),
            placeholder: momentFormat,
            displayFormat: formatForDx,
            showAnalogClock: false,
            valueChangeEvent: 'input blur',
            useMaskBehavior: true,
            showClearButton: true,
          };

          if (hasValidator(field, 'notInFuture' )) {
            options.max = today();
          }

          if (hasValidator(field, 'notInPast' )) {
            options.min = today();
          }

          return options;
        }

        function today() {
          var todaySinceMidnight = new Date();
          return todaySinceMidnight.setHours(0,0,0,0);
        }

        function hasValidator(field, validatorName) {
          return !!_.find(field.validate, { validator: validatorName })
        }
      }
    }
  }
})();
