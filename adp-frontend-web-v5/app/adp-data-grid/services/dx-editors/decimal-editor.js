;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('DecimalEditor', DecimalEditor);

  /** @ngInject */
  function DecimalEditor(
    DxEditorMixin,
    AdpFieldsService
  ) {
    function getOptions(init) {
      var defaults = {
        mode: 'text',
        onValueChanged: init.onValueChanged,
        value: init.args.data,
        valueChangeEvent: 'blur input',
        showSpinButtons: true,
        onKeyPress: function(e) {
          var isDecimalChar = /(\+|-|\.|(\d|e))/.test(e.event.key);
          if (!isDecimalChar) {
            e.event.preventDefault();
          }
        },
        onPaste: function (e) {
          e.event.preventDefault();
          var pasteText = e.event.originalEvent.clipboardData.getData('text');
          this.option('value', pasteText.replace(/[^0-9.\-+]/g, ''));
        }
      };

      return AdpFieldsService.configFromParameters(init.args.modelSchema, defaults);
    }

    return function () {
      return DxEditorMixin({
        editorName: 'dxTextBox',

        create: function (init) {
          var options = getOptions(init);
          this.element = $('<div>');

          this.element[this.editorName](options);
        },
      });
    }
  }
})();
