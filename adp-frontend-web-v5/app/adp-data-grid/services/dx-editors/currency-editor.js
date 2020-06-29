;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('CurrencyEditor', CurrencyEditor);

  /** @ngInject */
  function CurrencyEditor(
    DX_ACCOUNTING_FORMAT,
    AdpFieldsService,
    DxEditorMixin
  ) {
    return function () {
      return DxEditorMixin({
        editorName: 'dxNumberBox',

        create: function (init) {
          this.element = $('<div>');
          this.element[this.editorName](this.getOptions(init));
        },

        getOptions: function (init) {
          var defaults = {
            onValueChanged: function (e) {
              if (e.value === 0 && _.isNumber(e.previousValue)) {
                // update on next change event fired
                e.component.option('value', null);
              } else {
                init.onValueChanged(e);
              }
            },
            value: init.args.data,
            valueChangeEvent: 'blur input',
            placeholder: init.placeholder,
            inputAttr: {
              autocomplete: AdpFieldsService.autocompleteValue(init.args.modelSchema),
            },
            showSpinButtons: true,
            format: DX_ACCOUNTING_FORMAT,
          };

          return AdpFieldsService.configFromParameters(init.args.modelSchema, defaults);
        },
      });
    };
  }
})();
