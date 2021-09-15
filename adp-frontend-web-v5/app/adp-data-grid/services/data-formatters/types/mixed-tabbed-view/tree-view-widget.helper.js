;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('TreeViewWidget', TreeViewWidget);

  /** @ngInject */
  function TreeViewWidget(TreeViewDataMapper) {
    return function (data) {
      var treeViewData = TreeViewDataMapper(data);
      var td = $('<div>');
      if (treeViewData.length === 1) {
        treeViewData[0].expanded = true;
      }

      td.dxTreeView({
        animationEnabled: false,
        expandEvent: 'click',
        items: treeViewData,
        itemTemplate: function (itemData) {
          return itemData.text;
        }
      });
      return td;
    }
  }
})();
