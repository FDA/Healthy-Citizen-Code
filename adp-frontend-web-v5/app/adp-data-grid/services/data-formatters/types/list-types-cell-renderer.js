;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ListTypesCellRenderer', ListTypesCellRenderer);

  /** @ngInject */
  function ListTypesCellRenderer(GRID_FORMAT) {
    function single(args) {
      var value = args.data;
      if (_.isNil(value)) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      var list = getList(args.modelSchema);
      var label = list[value];

      return label || value;
    }

    function multiple(args) {
      var value = args.data;

      if (_.isNil(value) || _.isEmpty(value)) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      var list = getList(args.modelSchema);
      var values = _.map(value, function (v) {
        return list[v];
      });

      return values.join(', ');
    }

    function getList(field) {
      return field.list || field.dynamicList;
    }

    return {
      single: single,
      multiple: multiple,
    }
  }
})();
