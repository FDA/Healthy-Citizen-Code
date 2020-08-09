;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('DxDateConfig', DxDateConfig);

  /** @ngInject */
  function DxDateConfig(AdpValidationUtils) {
    return function (args) {
      return {
        options: getOptions(args),
        widgetName: 'dxDateBox',
      };
    }

    function getOptions(args) {
      var field = args.fieldSchema;
      var fieldType = args.fieldSchema.type;
      var momentFormat = AdpValidationUtils.getDateFormat(fieldType);
      var dxFormat = momentFormat
        .replace(/D/g, 'd')
        .replace(/Y/g, 'y');

      var options = {
        type: fieldType.toLowerCase(),
        placeholder: momentFormat,
        displayFormat: dxFormat,
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

})();
