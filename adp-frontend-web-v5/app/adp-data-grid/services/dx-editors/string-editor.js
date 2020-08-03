;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('StringEditor', StringEditor);

  /** @ngInject */
  function StringEditor(
    DxEditorMixin,
    AdpFieldsService
  ) {
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

    function getOptions(init) {
      var type = init.args.fieldSchema.type;
      var opts = {
        mode: getTextMode(type),
        onValueChanged: init.onValueChanged,
        value: init.args.data,
        valueChangeEvent: 'change keyup blur',
      };

      enableMask(type, opts);

      return AdpFieldsService.configFromParameters(init.args.fieldSchema, opts);
    }

    function getTextMode(type) {
      var types = {
        'Email': 'email',
        'PasswordAuth': 'password',
        'Url': 'url',
      };

      return types[type] || 'text';
    }

    function enableMask(type, config) {
      if (type !== 'Phone') {
        return;
      }

      _.assign(config, {
        mask: 'X00-X00-0000',
        maskRules: { X: /[02-9]/ },
        maskChar: 'x',
        maskInvalidMessage: false,
        showMaskMode: 'onFocus',
      });
    }
  }
})();
