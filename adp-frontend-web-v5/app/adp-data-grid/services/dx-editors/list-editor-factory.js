;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ListEditorFactory', ListEditorFactory);

  /** @ngInject */
  function ListEditorFactory(
    AdpFieldsService,
    AdpListsService,
    DxEditorMixin
  ) {
    function getOptions(init) {
      var defaults = {
        value: init.args.data,
        valueExpr: 'value',
        displayExpr: 'label',
        elementAttr: {
          class: 'adp-select-box',
          id: 'cell_list_id_' + init.args.fieldSchema.fieldName,
        },
        dataSource: AdpListsService.getDataSource(init.args),
        onValueChanged: init.onValueChanged,
        showClearButton: true,
        onOpened: function (e) {
          var ds = e.component.option('dataSource');
          (ds instanceof DevExpress.data.DataSource) && ds.reload();
        },
      };

      return AdpFieldsService.configFromParameters(init.args.fieldSchema, defaults);
    }

    function factory(multiple) {
      return DxEditorMixin({
        create: function (init) {
          var options = getOptions(init);

          this.element = $('<div>');
          this.editorName = multiple ? 'dxTagBox' : 'dxSelectBox';
          this.element[this.editorName](options);
        }
      });
    }

    return {
      single: function () {
        return factory(false);
      },

      multiple: function () {
        return factory(true);
      }
    }
  }
})();
