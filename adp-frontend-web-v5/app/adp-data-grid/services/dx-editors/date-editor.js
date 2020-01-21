;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('DateEditor', DateEditor);

  /** @ngInject */
  function DateEditor(
    AdpSchemaService,
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
      var field = init.args.modelSchema;
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
        onValueChanged: init.onValueChanged,
        tabIndex: 0,
        value: init.args.data,
        valueChangeEvent: 'change',
        useMaskBehavior: true,
        showClearButton: true,
      };

      if (notInFuture(field)) {
        options.max = today();
      }

      if (notInPast(field)) {
        options.min = today();
      }

      return options;
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
