;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ListTypesCellRenderer', ListTypesCellRenderer);

  /** @ngInject */
  function ListTypesCellRenderer(
    GRID_FORMAT,
    AdpListsService,
    FormattersHelper
  ) {
    function single(args) {
      return cellRenderer(args, 'single');
    }

    function multiple(args) {
      return cellRenderer(args, 'multiple');
    }

    function cellRenderer(args, type) {
      var value = args.data;
      if (_.isNil(value) || _.isEmpty(value)) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      if (FormattersHelper.asText(args)) {
        return _.isArray(value) ? value.join(',') : value;
      }

      var content = $('<div>');
      getList(args)
        .then(function (list) {
          var contentGetter = getContentGetterFn(type);
          var labels = contentGetter(list, value);
          content.append(labels);
        });

      return content;
    }

    function getList(args) {
      if (args.modelSchema.dynamicList) {
        return AdpListsService.requestDynamicList(args)
          .catch(function (error) {
            console.error('Error while try fetch List with: ', args, error);
            return {};
          });
      } else {
        return Promise.resolve(args.modelSchema.list);
      }
    }

    function getContentGetterFn(type) {
      return ({
        single: getSingleValueForList,
        multiple: getMultipleValues,
      })[type];
    }

    function getSingleValueForList(list, value) {
      var label = list[value];
      return label || value;
    }

    function getMultipleValues(list, value) {
      return _.map(value, _.partial(getSingleValueForList, list)).join(', ')
    }

    return {
      single: single,
      multiple: multiple,
    }
  }
})();
