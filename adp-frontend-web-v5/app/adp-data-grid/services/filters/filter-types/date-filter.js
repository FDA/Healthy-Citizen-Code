;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('DateFilter', DateFilter);

  /** @ngInject */
  function DateFilter(
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

    function momentToDxFormatConvert(format) {
      return format
        .replace(/D/g, 'd')
        .replace(/Y/g, 'y');
    }

    function getOptions(init) {
      var fieldType = init.args.modelSchema.type;
      var momentFormat = AdpValidationUtils.getDateFormat(fieldType);
      var INPUT_TIMEOUT = 1500; //Have to be long enough to let user enter full date/time w/o onValueChanged called

      return {
        type: fieldType.toLowerCase(),
        placeholder: init.placeholder || momentFormat,
        displayFormat: momentToDxFormatConvert(momentFormat),
        showAnalogClock: false,
        onValueChanged: _.debounce(onValueChanged, INPUT_TIMEOUT),
        tabIndex: 0,
        value: init.args.data,
        valueChangeEvent: 'change keyup input',
        useMaskBehavior: true
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
