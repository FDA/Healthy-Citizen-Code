;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('BooleanEditor', BooleanEditor);

  /** @ngInject */
  function BooleanEditor(
    AdpFieldsService,
    DxEditorMixin
  ) {
    function getOptions(init) {
      var defaults = {
        elementAttr: {
          class: 'adp-select-box',
          id: 'cell_list_id_' + init.args.modelSchema.fieldName,
        },
        value: init.args.data,
        displayExpr: 'label',
        valueExpr: 'value',
        placeholder: '(All)',
        items: getDataSource(),
        onValueChanged: init.onValueChanged,
        valueChangeEvent: 'change',
      };

      return AdpFieldsService.configFromParameters(init.args.modelSchema, defaults);
    }

    function getDataSource() {
      return [
        { label: 'Yes', value: true },
        { label: 'No', value: null },
      ];
    }

    return function () {
      return DxEditorMixin({
        editorName: 'dxSelectBox',

        create: function (init) {
          var options = getOptions(init);
          this.element = $('<div>');

          this.element[this.editorName](options);
        },
      });
    }
  }
})();
