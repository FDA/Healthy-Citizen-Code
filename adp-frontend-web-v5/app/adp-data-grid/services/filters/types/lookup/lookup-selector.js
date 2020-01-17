;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('LookupSelector', LookupSelector);

  /** @ngInject */
  function LookupSelector(
    LookupDataSource,
    AdpLookupHelpers,
    DxFilterMixin,
    LookupDxConfig
  ) {
    return function (options, table) {
      var $component = DxFilterMixin({
        element: $('<div>'),
        editorName: 'dxTagBox',

        create: function (options) {
          this.args = options.args;
          this.editorOptions = LookupDxConfig.filter(options);

          this.element[this.editorName](this.editorOptions);
        },

        updateDataSource: function (tableName) {
          var dataSource = LookupDataSource(this.args, tableName);
          this.getInstance().option('dataSource', dataSource);
        },
      });

      $component.create(options, table);

      return $component;
    };
  }
})();
