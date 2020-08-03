;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('DateEditor', DateEditor);

  /** @ngInject */
  function DateEditor(
    AdpSchemaService,
    AdpFieldsService,
    DxEditorMixin,
    AdpValidationUtils
  ) {
    return function () {
      return DxEditorMixin({
        editorName: 'dxDateBox',

        create: function (init) {
          this.element = $('<div>');
          this.element[this.editorName](getOptions(init));
        },
      });
    };

    function getOptions(init) {
      var field = init.args.fieldSchema;
      var fieldType = field.type;
      var momentFormat = AdpValidationUtils.getDateFormat(fieldType);

      var formatForDx = momentFormat
        .replace(/D/g, 'd')
        .replace(/Y/g, 'y');

      var defaults = {
        type: fieldType.toLowerCase(),
        placeholder: momentFormat,
        displayFormat: formatForDx,
        showAnalogClock: false,
        onValueChanged: init.onValueChanged,
        value: init.args.data,
        valueChangeEvent: 'change keyup',
        useMaskBehavior: true,
        showClearButton: true,
      };

      if (notInFuture(field)) {
        defaults.max = today();
      }

      if (notInPast(field)) {
        defaults.min = today();
      }

      return AdpFieldsService.configFromParameters(field, defaults);
    }

    function today() {
      var todaySinceMidnight = new Date();
      return todaySinceMidnight.setHours(0,0,0,0);
    }

    function notInFuture(field) {
      return _.find(field.validate, function (validator) {
        return validator.validator === 'notInFuture';
      });
    }

    function notInPast(field) {
      return _.find(field.validate, function (validator) {
        return validator.validator === 'notInPast';
      });
    }
  }
})();
