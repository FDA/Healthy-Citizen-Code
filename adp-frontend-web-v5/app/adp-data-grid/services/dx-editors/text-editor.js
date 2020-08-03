;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('TextEditor', TextEditor);

  /** @ngInject */
  function TextEditor(
    DxEditorMixin,
    AdpFieldsService
  ) {
    function getOptions(init) {
      var defaults = {
        mode: 'text',
        onValueChanged: init.onValueChanged,
        value: init.args.data,
        valueChangeEvent: 'change input',
      };

      return AdpFieldsService.configFromParameters(init.args.fieldSchema, defaults);
    }

    return function () {
      return DxEditorMixin({
        editorName: 'dxTextArea',

        create: function (init) {
          var options = getOptions(init);
          this.element = $('<div>');

          this.element[this.editorName](options);
        },
      });
    }
  }
})();
