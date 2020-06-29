;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('StringMultipleEditor', StringMultipleEditor);

  /** @ngInject */
  function StringMultipleEditor(
    DxEditorMixin,
    AdpFieldsService
  ) {
    function getOptions(init) {
      var defaults = {
        elementAttr: {
          class: 'adp-select-box',
        },
        value: init.args.data,
        acceptCustomValue: true,
        onValueChanged: init.onValueChanged,
        openOnFieldClick: false,
        showClearButton: true,
      };

      return AdpFieldsService.configFromParameters(init.args.modelSchema, defaults);
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
