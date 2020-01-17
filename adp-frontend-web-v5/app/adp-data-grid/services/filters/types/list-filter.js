;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ListFilter', ListFilter);

  /** @ngInject */
  function ListFilter(
    AdpFieldsService,
    DxFilterMixin
  ) {
    function getOptions(init) {
      return {
        value: init.args.data,
        valueExpr: 'value',
        displayExpr: 'label',
        elementAttr: { 'class': 'data-grid-tagbox-filter' },
        dataSource: getDataSource(init.args.modelSchema),
        onValueChanged: init.onValueChanged,
      };
    }

    function getDataSource(modelSchema) {
      return AdpFieldsService.getListOfOptions(modelSchema.list);
    }

    return function () {
      return DxFilterMixin({
        editorName: 'dxTagBox',

        create: function (init) {
          var options = getOptions(init);
          this.element = $('<div>');

          this.element[this.editorName](options);
        }
      });
    };
  }
})();
