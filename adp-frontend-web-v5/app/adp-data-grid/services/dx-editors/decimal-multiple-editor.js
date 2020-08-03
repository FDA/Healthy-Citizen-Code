;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('DecimalMultipleEditor', DecimalMultipleEditor);

  /** @ngInject */
  function DecimalMultipleEditor(
    NumberArrayEditorConfig,
    DxEditorMixin,
    AdpFieldsService
  ) {
    return function () {
      return DxEditorMixin({
        editorName: 'dxTagBox',

        create: function (init) {
          this.init = init;
          this.element = $('<div>');
          this.element[this.editorName](this.getOptions());
        },

        getOptions: function () {
          var fieldData = this.init.args.data;
          var fieldSchema = this.init.args.fieldSchema;
          var defaults = NumberArrayEditorConfig(fieldData, this.init.onValueChanged);

          var editorConfig = _.merge(defaults, {
            fieldTemplate: fieldTemplate,
            elementAttr: { class: 'adp-select-box adp-number-array' },
          });

          return AdpFieldsService.configFromParameters(fieldSchema, editorConfig);
        }
      });
    }

    function fieldTemplate(data, container) {
      var textBox = $('<div class="adp-text-box">')
        .dxTextBox(fieldConfig());

      container.append(textBox);
    }

    function fieldConfig() {
      return {
        placeholder: 'Type in new value and press Enter',
        mode: 'text',
        valueChangeEvent: 'blur input',
        onKeyPress: function (e) {
          var isDecimalChar = /(\+|-|\.|(\d|e))/.test(e.event.key);
          if (!isDecimalChar) {
            e.event.preventDefault();
          }
        },
        onPaste: function (e) {
          e.event.preventDefault();
          var pasteText = e.event.originalEvent.clipboardData.getData('text');
          this.option('value', pasteText.replace(/[^0-9.\-+]/g, ''));
        },
      }
    }
  }
})();
