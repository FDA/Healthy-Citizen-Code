;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ListFilter', ListFilter);

  /** @ngInject */
  function ListFilter(
    AdpFieldsService,
    DxEditorMixin
  ) {
    return function () {
      return DxEditorMixin({
        create: function (init) {
          var options = getOptions(init);

          this.element = $('<div>');
          this.editorName = 'dxTagBox';
          this.element[this.editorName](options);
        }
      });
    };

    function getOptions(init) {
      return {
        value: init.args.data,
        valueExpr: 'value',
        displayExpr: 'label',
        elementAttr: {
          class: 'adp-select-box',
          id: 'list_id_filter' + init.args.modelSchema.fieldName,
        },
        dataSource: getDataSource(init.args.modelSchema),
        onValueChanged: init.onValueChanged,
        showSelectionControls: true,
      };
    }

    function getDataSource(modelSchema) {
      return AdpFieldsService.getListOfOptions(modelSchema.list);
    }
  }
})();
