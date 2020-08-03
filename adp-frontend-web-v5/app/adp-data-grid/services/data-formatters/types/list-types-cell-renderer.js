;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ListTypesCellRenderer', ListTypesCellRenderer);

  /** @ngInject */
  function ListTypesCellRenderer(
    GRID_FORMAT,
    AdpListsService
  ) {
    return function cellRenderer(args) {
      if (_.isNil(args.data) || _.isEmpty(args.data)) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      var list = getList(args);
      return args.fieldSchema.type.includes('[]') ?
        getMultipleValues(list, args.data) :
        getSingleValueForList(list, args.data);
    }

    function getList(args) {
      if (args.fieldSchema.dynamicList) {
        return AdpListsService.getListFromCache(args.modelSchema.schemaName, args.schemaPath);
      } else {
        return args.fieldSchema.list;
      }
    }

    function getSingleValueForList(list, value) {
      var label = list[value];
      return label || value;
    }

    function getMultipleValues(list, value) {
      return _.map(value, _.partial(getSingleValueForList, list)).join(', ')
    }
  }
})();
