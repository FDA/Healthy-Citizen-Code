;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('IntEditor', IntEditor);

  /** @ngInject */
  function IntEditor(
    DxEditorMixin,
    AdpFieldsService
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
      var defaults = {
        mode: 'number',
        onValueChanged: init.onValueChanged,
        value: init.args.data,
        valueChangeEvent: 'blur input',
        placeholder: init.placeholder,
        format: '#',
        showSpinButtons: true,
      };

      return AdpFieldsService.configFromParameters(init.args.fieldSchema, defaults);
    }
  }
})();
