;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('DateFilter', DateFilter);

  /** @ngInject */
  function DateFilter(
    AdpSchemaService,
    DxEditorMixin,
    DateTypesCellRenderer,
    AdpValidationUtils
  ) {
    return function () {
      return DxEditorMixin({
        editorName: 'dxDateBox',

        create: function (init) {
          this.element = $('<div>');
          this.element[this.editorName](getOptions(init));
        },

        formatValue: function(params) {
          return DateTypesCellRenderer.date(params.args);
        },
      });
    };

    function momentToDxFormatConvert(format) {
      return format
        .replace(/D/g, 'd')
        .replace(/Y/g, 'y');
    }

    function getOptions(init) {
      var fieldType = init.args.fieldSchema.type;
      var momentFormat = AdpValidationUtils.getDateFormat(fieldType);
      var INPUT_TIMEOUT = 1500; //Have to be long enough to let user enter full date/time w/o onValueChanged called

      return {
        type: fieldType.toLowerCase(),
        placeholder: init.placeholder || momentFormat,
        displayFormat: momentToDxFormatConvert(momentFormat),
        showAnalogClock: false,
        tabIndex: 0,
        value: init.args.data,
        valueChangeEvent: 'change keyup input blur',
        useMaskBehavior: true,
        onValueChanged: init.parentType === 'filterBuilder' ?
          onValueChanged :
          _.debounce(onValueChanged, INPUT_TIMEOUT),
      };

      function onValueChanged(e) {
        if (e.value) {
          e.value = moment(moment(e.value).format(momentFormat), momentFormat).toDate();
        }

        init.onValueChanged(e);
      }
    }
  }
})();
