;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('StringEditor', StringEditor);

  /** @ngInject */
  function StringEditor(DxEditorMixin) {
    function getOptions(init) {
      var INPUT_TIMEOUT = 300;
      return {
        mode: 'text',
        onValueChanged: _.debounce(init.onValueChanged, INPUT_TIMEOUT),
        value: init.args.data,
        valueChangeEvent: 'change input',
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
