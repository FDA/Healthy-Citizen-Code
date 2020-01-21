;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ListEditorFactory', ListEditorFactory);

  /** @ngInject */
  function ListEditorFactory(
    AdpFieldsService,
    DxEditorMixin
  ) {
    function getOptions(init) {
      return {
        value: init.args.data,
        valueExpr: 'value',
        displayExpr: 'label',
        elementAttr: {
          class: 'adp-select-box',
          id: 'list_id_' + init.args.modelSchema.fieldName,
        },
        dataSource: getDataSource(init.args.modelSchema),
        onValueChanged: init.onValueChanged,
      };
    }

    function getDataSource(modelSchema) {
      return AdpFieldsService.getListOfOptions(modelSchema.list);
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
