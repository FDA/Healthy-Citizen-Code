;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('LookupTableSelector', LookupTableSelector);

  /** @ngInject */
  function LookupTableSelector(
    DxFilterMixin,
    LookupDxConfig
  ) {
    return function (options) {
      var component = DxFilterMixin({
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
