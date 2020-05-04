;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('LookupFilterTableSelector', LookupFilterTableSelector);

  /** @ngInject */
  function LookupFilterTableSelector(
    DxEditorMixin,
    LookupDxConfig
  ) {
    return function (options) {
      var component = DxEditorMixin({
        editorName: 'dxSelectBox',
        element: $('<div>'),

        create: function (options) {
          this.editorOptions = LookupDxConfig.tableSelector(options);
          this.element[this.editorName](this.editorOptions);
        },
      });

      component.create(options);

      return component;
    };
  }
})();
