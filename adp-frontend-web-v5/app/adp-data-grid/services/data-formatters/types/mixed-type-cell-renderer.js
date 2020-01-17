;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('MixedTypeCellRenderer', MixedTypeCellRenderer);

  /** @ngInject */
  function MixedTypeCellRenderer(
    FormattersHelper,
    TreeView
  ) {
    function treeView(args) {
      if (_.isNil(args.data) || _.isEmpty(args.data)) {
        return '-';
      }

      var data = treeViewData(args);
      return TreeView.create(data, { asText: FormattersHelper.asText(args) });
    }

    function treeViewData(args) {
      return mapDataToTreeView(args.data, args.modelSchema.fullName);
    }

    function mapDataToTreeView(data, name) {
      if (_.isArray(data)) {
        return {
          text: nameTpl(name),
          items: mapToArray(data),
        };
      } else if (_.isObject(data)) {
        return {
          text: nameTpl(name),
          items: mapToObject(data),
        };
      } else {
        return { text: nameTpl(name) + data };
      }

      function mapToArray(array) {
        return _.chain(array)
          .compact()
          .map(mapDataToTreeView)
          .value();
      }

      function mapToObject(object) {
        return _.chain(object)
          .map(mapDataToTreeView)
          .compact()
          .value();
      }
    }

    function nameTpl(name) {
      return '<b>' + name + '</b>: ';
    }

    return {
      treeView: treeView,
      treeViewData: treeViewData,
    }
  }
})();
