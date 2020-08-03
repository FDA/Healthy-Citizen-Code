;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('CurrencyFilter', CurrencyFilter);

  /** @ngInject */
  function CurrencyFilter(
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
          var changeHandler = _.debounce(init.onValueChanged, 300);

          return {
            onValueChanged: function (e) {
              if (e.value === 0 && _.isNumber(e.previousValue)) {
                // update on next change event fired
                e.component.option('value', null);
              } else {
                changeHandler(e);
              }
            },
            value: init.args.data,
            valueChangeEvent: 'blur input',
            placeholder: init.placeholder,
            inputAttr: {
              autocomplete: AdpFieldsService.autocompleteValue(init.args.fieldSchema),
            },
            showSpinButtons: true,
            format: _.get(init, 'args.fieldSchema.parameters.format', DX_ACCOUNTING_FORMAT),
          }
        },
      });
    };
  }
})();
