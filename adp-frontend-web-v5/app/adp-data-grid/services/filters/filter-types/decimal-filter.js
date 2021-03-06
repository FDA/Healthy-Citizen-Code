;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('DecimalFilter', DecimalFilter);

  /** @ngInject */
  function DecimalFilter(DxEditorMixin) {
    function getOptions(init) {
      return {
        mode: 'text',
        onValueChanged: _.debounce(init.onValueChanged, 300),
        value: init.args.data,
        valueChangeEvent: 'blur input',
        onKeyPress: function(e) {
          var isDecimalChar = /(\+|-|\.|\d)/.test(e.event.key);
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
