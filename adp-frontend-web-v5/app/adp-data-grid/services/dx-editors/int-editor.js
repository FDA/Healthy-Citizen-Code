;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('IntEditor', IntEditor);

  /** @ngInject */
  function IntEditor(
    DxEditorMixin
  ) {
    return function () {
      return DxEditorMixin({
        editorName: 'dxNumberBox',

        create: function (init) {
          var options = getOptions(init);
          this.element = $('<div>');

          this.element[this.editorName](options);
        },
      });
    };

    function getOptions(init) {
      return {
        mode: 'number',
        onValueChanged: init.onValueChanged,
        value: init.args.data,
        valueChangeEvent: 'blur input',
        placeholder: init.placeholder,
        format: '#',
      };
    }
  }
})();
