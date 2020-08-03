;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('BooleanFilter', BooleanFilter);

  /** @ngInject */
  function BooleanFilter(
    DxEditorMixin,
    BasicTypesCellRenderer,
    BOOLEAN_FILTER_VALUES
  ) {
    function getOptions(init) {
      return {
        elementAttr: {
          class: 'adp-select-box',
          id: 'list_id_' + init.args.fieldSchema.fieldName,
        },
        value: init.args.data,
        displayExpr: 'label',
        valueExpr: 'value',
        placeholder: '(All)',
        items: getDataSource(),
        onValueChanged: init.onValueChanged,
        valueChangeEvent: 'change blur',
      };
    }

    function getDataSource() {
      return [
        { label: 'Yes', value: BOOLEAN_FILTER_VALUES.TRUE },
        { label: 'No', value: BOOLEAN_FILTER_VALUES.FALSE },
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

        formatValue: function(params){
          return BasicTypesCellRenderer.boolean(params.args);
        }
      });
    }
  }
})();
