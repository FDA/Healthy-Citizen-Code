;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('DxDecimalConfig', DxDecimalConfig);

  /** @ngInject */
  function DxDecimalConfig() {
    return function () {
      return {
        options: {
          mode: 'text',
          showSpinButtons: true,
          onKeyPress: function (e) {
            var isDecimalChar = /(\+|-|\.|(\d|e))/.test(e.event.key);
            if (!isDecimalChar) {
              e.event.preventDefault()
            }
          },
          onPaste: function (e) {
            e.event.preventDefault();
            var pasteText = e.event.originalEvent.clipboardData.getData('text');
            this.option('value', pasteText.replace(/[^0-9.\-+]/g, ''));
          },
        },
        widgetName: 'dxTextBox',
      };
    }
  }

})();
