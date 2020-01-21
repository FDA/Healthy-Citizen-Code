;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('StringMultipleEditor', StringMultipleEditor);

  /** @ngInject */
  function StringMultipleEditor(DxEditorMixin) {
    function getOptions(init) {
      return {
        elementAttr: {
          class: 'adp-select-box',
        },
        value: init.args.data,
        acceptCustomValue: true,
        onValueChanged: init.onValueChanged,
      };
    }

    return function () {
      return DxEditorMixin({
        editorName: 'dxTagBox',

        create: function (init) {
          var options = getOptions(init);
          this.element = $('<div>');
          this.element[this.editorName](options);
        },
      });
    }
  }
})();
