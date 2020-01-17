;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridActions', GridActions);

  /** @ngInject */
  function GridActions(
    GridToolbarActions,
    GridTableActions
  ) {
    return function (options, schema) {
      GridToolbarActions(options, schema);
      GridTableActions(options, schema);
    }
  }
})();
