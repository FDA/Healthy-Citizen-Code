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

    function getOptions(init) {
      var fieldData = init.args.data;
      var fieldType = init.args.fieldSchema.type;
      var initialValue = getInitialValue(fieldData, fieldType);

      var defaults = {
        elementAttr: {
          class: 'adp-select-box',
          id: 'cell_list_id_' + init.args.fieldSchema.fieldName,
        },
        value: initialValue,
        displayExpr: 'label',
        valueExpr: 'value',
        items: getDataSource(fieldType),
        onValueChanged: init.onValueChanged,
        valueChangeEvent: 'change',
        showClearButton: fieldType === 'TriStateBoolean',
      };

      return AdpFieldsService.configFromParameters(init.args.fieldSchema, defaults);
    }

    function getInitialValue(val, type) {
      if (type === 'Boolean') {
        return val === false ? null : val;
      }

      return val;
    }

    function getDataSource(type) {
      if (type === 'Boolean') {
        return [
          { label: 'Yes', value: true },
          { label: 'No', value: null },
        ];
      }

      return [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ];
    }
  }
})();
