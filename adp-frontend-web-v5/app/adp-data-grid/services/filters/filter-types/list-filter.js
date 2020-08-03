;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ListFilter', ListFilter);

  /** @ngInject */
  function ListFilter(
    AdpListsService,
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
      var args = _.assign({}, init.args, { action: 'listFilter' });
      var ds = getDataSource(args);

      return {
        value: args.data,
        valueExpr: 'value',
        displayExpr: 'label',
        elementAttr: {
          class: 'adp-select-box',
          id: 'list_id_filter' + args.fieldSchema.fieldName,
        },
        dataSource: ds,
        onValueChanged: init.onValueChanged,
        showSelectionControls: true,
      };
    }

    function getDataSource(args) {
      var list = args.fieldSchema.list ||
        AdpListsService.getListFromCache(args.modelSchema.schemaName, args.schemaPath);

      return _.map(list, function (val, key) {
        return { value: key, label: val };
      });
    }
  }
})();
