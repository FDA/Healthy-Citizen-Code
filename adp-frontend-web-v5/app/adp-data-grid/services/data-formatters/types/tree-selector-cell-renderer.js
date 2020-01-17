;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('TreeSelectorCellRenderer', TreeSelectorCellRenderer);

  /** @ngInject */
  function TreeSelectorCellRenderer(
    FormattersHelper,
    TreeView
  ) {
    function treeView(args) {
      if (_.isNil(args.data) || _.isEmpty(args.data)) {
        return '-';
      }
      var data = treeViewData(args.data);
      return TreeView.create(data[0], {expand: 'all', asText: FormattersHelper.asText(args) });
    }

    function treeViewData(data) {
      var current = {};
      var result = [current];

      _.each(data, function (value, index) {
        current.text = value.label;

        if (isLast(data, index)) {
          return;
        }

        current = moveToNext(current);
      });

      return result;
    }

    function isLast(data, index) {
      var endIndex = data.length - 1;
      return endIndex === index;
    }

    function moveToNext(current) {
      var next = {};
      current.items = [next];

      return next;
    }

    return {
      treeView: treeView,
      treeViewData: treeViewData,
    }
  }
})();
