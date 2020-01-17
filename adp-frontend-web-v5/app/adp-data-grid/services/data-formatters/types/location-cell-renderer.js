;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('LocationCellRenderer', LocationCellRenderer);

  /** @ngInject */
  function LocationCellRenderer(
    GRID_FORMAT
  ) {
    return {
      render: render,
    };

    function render(args) {
      var data = args.data;

      if (_.isNil(data.label)) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      return data.label;
    }
  }
})();
